package com.foodie.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.auth.entity.UserCredential;
import com.foodie.auth.repository.UserCredentialRepository;
import com.foodie.common.enums.UserType;
import com.foodie.common.exception.ConflictException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.infrastructure.storage.ObjectStorageClient;
import com.foodie.shared.contract.ActiveOrderAddressQuery;
import com.foodie.user.dto.request.AddAddressRequestDto;
import com.foodie.user.dto.request.UpdateProfileRequestDto;
import com.foodie.user.dto.response.AddressResponseDto;
import com.foodie.user.dto.response.CustomerProfileResponseDto;
import com.foodie.user.entity.Address;
import com.foodie.user.entity.Customer;
import com.foodie.user.mapper.CustomerMapper;
import com.foodie.user.repository.AddressRepository;
import com.foodie.user.repository.CustomerRepository;
import com.foodie.user.service.impl.CustomerServiceImpl;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class CustomerServiceImplTest {

    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private AddressRepository addressRepository;
    @Mock
    private UserCredentialRepository userCredentialRepository;
    @Mock
    private ObjectStorageClient objectStorageClient;
    @Mock
    private ActiveOrderAddressQuery activeOrderAddressQuery;
    @Mock
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    private CustomerServiceImpl service;
    private final UUID credentialId = UUID.randomUUID();
    private Customer customer;

    @BeforeEach
    void setUp() {
        service = new CustomerServiceImpl(
                customerRepository,
                addressRepository,
                userCredentialRepository,
                new CustomerMapper(),
                objectStorageClient,
                activeOrderAddressQuery,
                passwordEncoder
        );
        customer = Customer.createInitial(credentialId, null);
        // assign id via reflection-free save simulation: use a subclass trick — set through repository stub returns
    }

    @Test
    void getMyProfile_returnsPhoneFromCredential() {
        Customer saved = persistableCustomer("Ananya Rao", "a@example.com");
        when(customerRepository.findByUserCredentialId(credentialId)).thenReturn(Optional.of(saved));
        UserCredential credential = UserCredential.phoneSignup("+919876543210", UserType.CUSTOMER);
        when(userCredentialRepository.findById(credentialId)).thenReturn(Optional.of(credential));

        CustomerProfileResponseDto profile = service.getMyProfile(credentialId);

        assertThat(profile.customerId()).isEqualTo(saved.getId());
        assertThat(profile.fullName()).isEqualTo("Ananya Rao");
        assertThat(profile.phoneNumber()).isEqualTo("+919876543210");
        assertThat(profile.email()).isEqualTo("a@example.com");
    }

    @Test
    void getMyProfile_missingCustomer_throws404() {
        when(customerRepository.findByUserCredentialId(credentialId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getMyProfile(credentialId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateMyProfile_putClearsEmailWhenNull() {
        Customer saved = persistableCustomer("Old Name", "old@example.com");
        when(customerRepository.findByUserCredentialId(credentialId)).thenReturn(Optional.of(saved));
        when(userCredentialRepository.findById(credentialId)).thenReturn(Optional.empty());

        CustomerProfileResponseDto updated = service.updateMyProfile(
                credentialId,
                new UpdateProfileRequestDto("Ananya Rao", null)
        );

        assertThat(updated.fullName()).isEqualTo("Ananya Rao");
        assertThat(updated.email()).isNull();
        assertThat(saved.getEmail()).isNull();
    }

    @Test
    void addAddress_setsDefaultAndClearsPrevious() {
        Customer saved = persistableCustomer("Ananya Rao", null);
        when(customerRepository.findByUserCredentialId(credentialId)).thenReturn(Optional.of(saved));
        when(addressRepository.save(any(Address.class))).thenAnswer(inv -> {
            Address a = inv.getArgument(0);
            if (a.getId() == null) {
                setEntityId(a, UUID.randomUUID());
            }
            return a;
        });

        AddAddressRequestDto request = new AddAddressRequestDto(
                null,
                null,
                null,
                null,
                null,
                "Home",
                "Line 1",
                null,
                "Bengaluru",
                "560103",
                new BigDecimal("12.935200"),
                new BigDecimal("77.691200"),
                true
        );

        AddressResponseDto dto = service.addAddress(credentialId, request);

        verify(addressRepository).clearDefaultForCustomer(saved.getId());
        assertThat(dto.isDefault()).isTrue();
        assertThat(dto.label()).isEqualTo("Home");
        assertThat(saved.getDefaultAddressId()).isEqualTo(dto.addressId());
    }

    @Test
    void removeAddress_inUseByActiveOrder_conflicts() {
        Customer saved = persistableCustomer("Ananya Rao", null);
        Address address = Address.create(
                saved, "Home", "L1", null, "Bengaluru", "560103",
                new BigDecimal("12.9"), new BigDecimal("77.6"), true
        );
        UUID addressId = UUID.randomUUID();
        setEntityId(address, addressId);
        saved.setDefaultAddressId(addressId);

        when(customerRepository.findByUserCredentialId(credentialId)).thenReturn(Optional.of(saved));
        when(addressRepository.findByIdAndCustomerId(addressId, saved.getId())).thenReturn(Optional.of(address));
        when(activeOrderAddressQuery.isAddressReferencedByActiveOrder(addressId)).thenReturn(true);

        assertThatThrownBy(() -> service.removeAddress(credentialId, addressId))
                .isInstanceOf(ConflictException.class)
                .extracting(ex -> ((ConflictException) ex).getErrorCode())
                .isEqualTo(ErrorCode.ADDRESS_IN_USE_BY_ACTIVE_ORDER);
        verify(addressRepository, never()).save(any());
    }

    @Test
    void removeAddress_clearsDefaultWithoutAutoSelect() {
        Customer saved = persistableCustomer("Ananya Rao", null);
        Address address = Address.create(
                saved, "Home", "L1", null, "Bengaluru", "560103",
                new BigDecimal("12.9"), new BigDecimal("77.6"), true
        );
        UUID addressId = UUID.randomUUID();
        setEntityId(address, addressId);
        saved.setDefaultAddressId(addressId);

        when(customerRepository.findByUserCredentialId(credentialId)).thenReturn(Optional.of(saved));
        when(addressRepository.findByIdAndCustomerId(addressId, saved.getId())).thenReturn(Optional.of(address));
        when(activeOrderAddressQuery.isAddressReferencedByActiveOrder(addressId)).thenReturn(false);

        service.removeAddress(credentialId, addressId);

        assertThat(address.getDeletedAt()).isNotNull();
        assertThat(saved.getDefaultAddressId()).isNull();
    }

    @Test
    void uploadProfileImage_persistsKey() throws Exception {
        Customer saved = persistableCustomer("Ananya Rao", null);
        when(customerRepository.findByUserCredentialId(credentialId)).thenReturn(Optional.of(saved));

        // Minimal PNG header + padding
        byte[] png = new byte[] {
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3
        };
        MockMultipartFile file = new MockMultipartFile("file", "a.png", "image/png", png);

        var response = service.uploadProfileImage(credentialId, file);

        assertThat(response.fileKey()).startsWith("users/" + credentialId + "/profile/");
        assertThat(response.fileKey()).endsWith(".png");
        assertThat(saved.getProfileImageKey()).isEqualTo(response.fileKey());
        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(objectStorageClient).putObject(keyCaptor.capture(), any(), any(Long.class), org.mockito.ArgumentMatchers.eq("image/png"));
        assertThat(keyCaptor.getValue()).isEqualTo(response.fileKey());
    }

    @Test
    void listAddresses_mapsAll() {
        Customer saved = persistableCustomer("Ananya Rao", null);
        Address address = Address.create(
                saved, "Home", "L1", "L2", "Bengaluru", "560103",
                new BigDecimal("12.9"), new BigDecimal("77.6"), false
        );
        setEntityId(address, UUID.randomUUID());
        when(customerRepository.findByUserCredentialId(credentialId)).thenReturn(Optional.of(saved));
        when(addressRepository.findByCustomerIdOrderByCreatedAtAsc(saved.getId())).thenReturn(List.of(address));

        List<AddressResponseDto> list = service.listAddresses(credentialId);
        assertThat(list).hasSize(1);
        assertThat(list.getFirst().city()).isEqualTo("Bengaluru");
    }

    private Customer persistableCustomer(String name, String email) {
        Customer c = Customer.createInitial(credentialId, email);
        c.updateProfile(name, email);
        setEntityId(c, UUID.randomUUID());
        return c;
    }

    private static void setEntityId(Object entity, UUID id) {
        try {
            var field = entity.getClass().getSuperclass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
