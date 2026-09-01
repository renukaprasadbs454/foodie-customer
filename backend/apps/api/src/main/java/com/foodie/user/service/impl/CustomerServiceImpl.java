package com.foodie.user.service.impl;

import com.foodie.auth.entity.UserCredential;
import com.foodie.auth.repository.UserCredentialRepository;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ConflictException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.infrastructure.storage.ImageMagicBytes;
import com.foodie.infrastructure.storage.ObjectStorageClient;
import com.foodie.shared.contract.ActiveOrderAddressQuery;
import com.foodie.user.dto.request.AddAddressRequestDto;
import com.foodie.user.dto.request.UpdateProfileRequestDto;
import com.foodie.user.dto.response.AddressResponseDto;
import com.foodie.user.dto.response.CustomerProfileResponseDto;
import com.foodie.user.dto.response.FileUploadResponseDto;
import com.foodie.user.entity.Address;
import com.foodie.user.entity.Customer;
import com.foodie.user.mapper.CustomerMapper;
import com.foodie.user.repository.AddressRepository;
import com.foodie.user.repository.CustomerRepository;
import com.foodie.user.service.CustomerService;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.foodie.user.dto.request.ChangePasswordRequestDto;
import com.foodie.user.dto.request.UpdateAddressRequestDto;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
public class CustomerServiceImpl implements CustomerService {

    private static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;

    private final CustomerRepository customerRepository;
    private final AddressRepository addressRepository;
    private final UserCredentialRepository userCredentialRepository;
    private final CustomerMapper customerMapper;
    private final ObjectStorageClient objectStorageClient;
    private final ActiveOrderAddressQuery activeOrderAddressQuery;
    private final PasswordEncoder passwordEncoder;

    public CustomerServiceImpl(
            CustomerRepository customerRepository,
            AddressRepository addressRepository,
            UserCredentialRepository userCredentialRepository,
            CustomerMapper customerMapper,
            ObjectStorageClient objectStorageClient,
            ActiveOrderAddressQuery activeOrderAddressQuery,
            PasswordEncoder passwordEncoder
    ) {
        this.customerRepository = customerRepository;
        this.addressRepository = addressRepository;
        this.userCredentialRepository = userCredentialRepository;
        this.customerMapper = customerMapper;
        this.objectStorageClient = objectStorageClient;
        this.activeOrderAddressQuery = activeOrderAddressQuery;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerProfileResponseDto getMyProfile(UUID userCredentialId) {
        Customer customer = requireCustomer(userCredentialId);
        return customerMapper.toProfile(customer, phoneOf(userCredentialId));
    }

    @Override
    @Transactional
    public CustomerProfileResponseDto updateMyProfile(UUID userCredentialId, UpdateProfileRequestDto request) {
        Customer customer = requireCustomer(userCredentialId);
        // PUT full-replace: omitted/null email clears the profile email (API Contracts §2.2).
        customer.updateProfile(request.fullName(), request.email());
        return getMyProfile(userCredentialId);
    }

    @Override
    @Transactional
    public void changePassword(UUID userCredentialId, ChangePasswordRequestDto request) {
        UserCredential credential = userCredentialRepository.findById(userCredentialId)
                .orElseThrow(() -> new ResourceNotFoundException("User credential not found."));

        String currentHash = credential.getPasswordHash();
        if (currentHash == null || !passwordEncoder.matches(request.currentPassword(), currentHash)) {
            throw new BadRequestException(ErrorCode.VALIDATION_FAILED, "Current password does not match.");
        }

        credential.updatePasswordHash(passwordEncoder.encode(request.newPassword()));
    }

    @Override
    @Transactional
    public AddressResponseDto updateAddress(UUID userCredentialId, UUID addressId, UpdateAddressRequestDto request) {
        Customer customer = requireCustomer(userCredentialId);
        Address address = addressRepository.findByIdAndCustomerId(addressId, customer.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Address not found."));

        address.update(
                request.recipientName(),
                request.recipientPhone(),
                request.houseFlatNo(),
                request.landmark(),
                request.state(),
                request.label(),
                request.line1(),
                request.line2(),
                request.city(),
                request.pincode(),
                request.latitude(),
                request.longitude()
        );
        return customerMapper.toAddress(address);
    }

    @Override
    @Transactional
    public AddressResponseDto setDefaultAddress(UUID userCredentialId, UUID addressId) {
        Customer customer = requireCustomer(userCredentialId);
        Address address = addressRepository.findByIdAndCustomerId(addressId, customer.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Address not found."));

        addressRepository.clearDefaultForCustomer(customer.getId());
        address.markDefault();
        customer.setDefaultAddressId(address.getId());
        return customerMapper.toAddress(address);
    }

    @Override
    @Transactional
    public AddressResponseDto addAddress(UUID userCredentialId, AddAddressRequestDto request) {
        Customer customer = requireCustomer(userCredentialId);
        boolean makeDefault = request.defaultFlag();
        if (makeDefault) {
            addressRepository.clearDefaultForCustomer(customer.getId());
        }
        Address address = Address.create(
                customer,
                request.recipientName(),
                request.recipientPhone(),
                request.houseFlatNo(),
                request.landmark(),
                request.state(),
                request.label(),
                request.line1(),
                request.line2(),
                request.city(),
                request.pincode(),
                request.latitude(),
                request.longitude(),
                makeDefault
        );
        address = addressRepository.save(address);
        if (makeDefault) {
            customer.setDefaultAddressId(address.getId());
        }
        return customerMapper.toAddress(address);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AddressResponseDto> listAddresses(UUID userCredentialId) {
        Customer customer = requireCustomer(userCredentialId);
        return addressRepository.findByCustomerIdOrderByCreatedAtAsc(customer.getId()).stream()
                .map(customerMapper::toAddress)
                .toList();
    }

    @Override
    @Transactional
    public void removeAddress(UUID userCredentialId, UUID addressId) {
        Customer customer = requireCustomer(userCredentialId);
        Address address = addressRepository.findByIdAndCustomerId(addressId, customer.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Address not found."));

        if (activeOrderAddressQuery.isAddressReferencedByActiveOrder(addressId)) {
            throw new ConflictException(
                    ErrorCode.ADDRESS_IN_USE_BY_ACTIVE_ORDER,
                    "Address is referenced by an active order and cannot be removed."
            );
        }

        boolean wasDefault = address.isDefault()
                || addressId.equals(customer.getDefaultAddressId());
        address.softDelete();
        if (wasDefault) {
            customer.clearDefaultAddress();
        }
    }

    @Override
    @Transactional
    public FileUploadResponseDto uploadProfileImage(UUID userCredentialId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException(ErrorCode.VALIDATION_FAILED, "file is required.");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new BadRequestException(ErrorCode.FILE_TOO_LARGE, "Profile image must be at most 5 MB.");
        }

        Customer customer = requireCustomer(userCredentialId);
        try {
            byte[] bytes = file.getBytes();
            if (bytes.length > MAX_IMAGE_BYTES) {
                throw new BadRequestException(ErrorCode.FILE_TOO_LARGE, "Profile image must be at most 5 MB.");
            }
            byte[] header = bytes.length <= 16 ? bytes : java.util.Arrays.copyOf(bytes, 16);
            ImageMagicBytes.DetectedImage detected = ImageMagicBytes.detect(header, file.getContentType());

            String key = "users/" + userCredentialId + "/profile/" + UUID.randomUUID() + "." + detected.extension();
            objectStorageClient.putObject(
                    key,
                    new ByteArrayInputStream(bytes),
                    bytes.length,
                    detected.contentType()
            );

            Instant uploadedAt = Instant.now();
            customer.setProfileImageKey(key);
            return new FileUploadResponseDto(key, uploadedAt);
        } catch (IOException ex) {
            throw new BadRequestException(ErrorCode.BAD_REQUEST, "Unable to read uploaded file.");
        }
    }

    private Customer requireCustomer(UUID userCredentialId) {
        return customerRepository.findByUserCredentialId(userCredentialId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Customer profile not found. Complete profile setup first."));
    }

    private String phoneOf(UUID userCredentialId) {
        return userCredentialRepository.findById(userCredentialId)
                .map(UserCredential::getPhoneNumber)
                .orElse(null);
    }
}
