package com.foodie.user.service;

import com.foodie.user.dto.request.AddAddressRequestDto;
import com.foodie.user.dto.request.ChangePasswordRequestDto;
import com.foodie.user.dto.request.UpdateAddressRequestDto;
import com.foodie.user.dto.request.UpdateProfileRequestDto;
import com.foodie.user.dto.response.AddressResponseDto;
import com.foodie.user.dto.response.CustomerProfileResponseDto;
import com.foodie.user.dto.response.FileUploadResponseDto;
import java.util.List;
import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;

public interface CustomerService {

    CustomerProfileResponseDto getMyProfile(UUID userCredentialId);

    CustomerProfileResponseDto updateMyProfile(UUID userCredentialId, UpdateProfileRequestDto request);

    void changePassword(UUID userCredentialId, ChangePasswordRequestDto request);

    AddressResponseDto addAddress(UUID userCredentialId, AddAddressRequestDto request);

    AddressResponseDto updateAddress(UUID userCredentialId, UUID addressId, UpdateAddressRequestDto request);

    AddressResponseDto setDefaultAddress(UUID userCredentialId, UUID addressId);

    List<AddressResponseDto> listAddresses(UUID userCredentialId);

    void removeAddress(UUID userCredentialId, UUID addressId);

    FileUploadResponseDto uploadProfileImage(UUID userCredentialId, MultipartFile file);
}
