package com.foodie.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.auth.dto.request.AdminLoginRequestDto;
import com.foodie.auth.dto.request.GoogleAuthRequestDto;
import com.foodie.auth.dto.request.VerifyOtpRequestDto;
import com.foodie.auth.dto.response.TokenPairResponseDto;
import com.foodie.auth.entity.UserCredential;
import com.foodie.auth.exception.InvalidOtpException;
import com.foodie.auth.exception.OtpExpiredException;
import com.foodie.auth.repository.RefreshTokenRepository;
import com.foodie.auth.repository.UserCredentialRepository;
import com.foodie.auth.service.impl.AuthServiceImpl;
import com.foodie.common.enums.UserType;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ForbiddenException;
import com.foodie.common.exception.UnauthorizedException;
import com.foodie.infrastructure.google.GoogleTokenVerifier;
import com.foodie.infrastructure.sms.SmsSender;
import com.foodie.security.jwt.JwtTokenProvider;
import com.foodie.security.ratelimit.RedisRateLimiter;
import com.foodie.shared.contract.AdminIdentityQueryPort;
import com.foodie.shared.event.UserCredentialCreatedEvent;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

        @Mock
        private UserCredentialRepository userCredentialRepository;
        @Mock
        private RefreshTokenRepository refreshTokenRepository;
        @Mock
        private StringRedisTemplate redisTemplate;
        @Mock
        private ValueOperations<String, String> valueOperations;
        @Mock
        private RedisRateLimiter rateLimiter;
        @Mock
        private SmsSender smsSender;
        @Mock
        private GoogleTokenVerifier googleTokenVerifier;
        @Mock
        private JwtTokenProvider jwtTokenProvider;
        @Mock
        private ApplicationEventPublisher eventPublisher;
        @Mock
        private AdminIdentityQueryPort adminIdentityQueryPort;

        private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        private AuthServiceImpl authService;

        @BeforeEach
        void setUp() {
                lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
                authService = new AuthServiceImpl(
                                userCredentialRepository,
                                refreshTokenRepository,
                                redisTemplate,
                                rateLimiter,
                                passwordEncoder,
                                smsSender,
                                googleTokenVerifier,
                                jwtTokenProvider,
                                eventPublisher,
                                adminIdentityQueryPort);
        }

        @Test
        void requestOtp_storesHashedOtpAndDispatchesSms() {
                lenient().doNothing().when(rateLimiter).check(anyString(), anyInt(), any(Duration.class));

                authService.requestOtp("+919876543210");

                ArgumentCaptor<String> hashCaptor = ArgumentCaptor.forClass(String.class);
                verify(valueOperations).set(eq("otp:+919876543210"), hashCaptor.capture(), eq(Duration.ofMinutes(5)));
                assertThat(hashCaptor.getValue()).startsWith("$2");
                verify(smsSender, timeout(2000)).sendOtp(eq("+919876543210"), anyString());
        }

        @Test
        void verifyOtp_expiredOtp_throwsOtpExpiredException() {
                lenient().doNothing().when(rateLimiter).check(anyString(), anyInt(), any(Duration.class));
                when(valueOperations.get("otp:+919876543210")).thenReturn(null);

                assertThatThrownBy(() -> authService.verifyOtp(
                                new VerifyOtpRequestDto("+919876543210", "555555", UserType.CUSTOMER, null)))
                                .isInstanceOf(OtpExpiredException.class);
        }

        @Test
        void verifyOtp_invalidOtp_throwsInvalidOtpException() {
                lenient().doNothing().when(rateLimiter).check(anyString(), anyInt(), any(Duration.class));
                when(valueOperations.get("otp:+919876543210")).thenReturn(passwordEncoder.encode("111111"));

                assertThatThrownBy(() -> authService.verifyOtp(
                                new VerifyOtpRequestDto("+919876543210", "999999", UserType.CUSTOMER, null)))
                                .isInstanceOf(InvalidOtpException.class);
        }

        @Test
        void verifyOtp_newUserWithoutUserType_throwsUserTypeRequired() {
                lenient().doNothing().when(rateLimiter).check(anyString(), anyInt(), any(Duration.class));

                assertThatThrownBy(() -> authService.verifyOtp(
                                new VerifyOtpRequestDto("+919876543210", "123456", null, null)))
                                .isInstanceOf(BadRequestException.class)
                                .extracting(ex -> ((BadRequestException) ex).getErrorCode())
                                .isEqualTo(ErrorCode.USER_TYPE_REQUIRED);
        }

        @Test
        void verifyOtp_existingUserSameType_issuesTokenPair() {
                lenient().doNothing().when(rateLimiter).check(anyString(), anyInt(), any(Duration.class));
                when(valueOperations.get("otp:+919876543210")).thenReturn(passwordEncoder.encode("482913"));

                UUID userId = UUID.randomUUID();
                UserCredential credential = UserCredential.phoneSignup("+919876543210", UserType.CUSTOMER);
                ReflectionTestUtils.setField(credential, "id", userId);

                when(userCredentialRepository.findAllByPhoneNumber("+919876543210"))
                                .thenReturn(java.util.List.of(credential));
                when(userCredentialRepository.findByPhoneNumberAndUserType("+919876543210", UserType.CUSTOMER))
                                .thenReturn(Optional.of(credential));
                when(jwtTokenProvider.createAccessToken(eq(userId), eq(UserType.CUSTOMER), isNull()))
                                .thenReturn("access");
                when(jwtTokenProvider.accessTokenTtlSeconds()).thenReturn(900L);
                when(jwtTokenProvider.refreshTtlSeconds(UserType.CUSTOMER)).thenReturn(2592000L);
                when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

                TokenPairResponseDto response = authService.verifyOtp(
                                new VerifyOtpRequestDto("+919876543210", "482913", UserType.CUSTOMER, "device"));

                assertThat(response.accessToken()).isEqualTo("access");
                assertThat(response.userType()).isEqualTo(UserType.CUSTOMER);
                assertThat(response.isNewUser()).isFalse();
                assertThat(response.userId()).isEqualTo(userId);
                assertThat(response.role()).isNull();
                assertThat(response.refreshToken()).isNotBlank();
                verify(redisTemplate).delete("otp:+919876543210");
        }

        @Test
        void verifyOtp_samePhoneDifferentType_createsSecondCredential() {
                lenient().doNothing().when(rateLimiter).check(anyString(), anyInt(), any(Duration.class));
                when(valueOperations.get("otp:+919876543210")).thenReturn(passwordEncoder.encode("482913"));

                UserCredential customer = UserCredential.phoneSignup("+919876543210", UserType.CUSTOMER);
                ReflectionTestUtils.setField(customer, "id", UUID.randomUUID());

                when(userCredentialRepository.findAllByPhoneNumber("+919876543210"))
                                .thenReturn(java.util.List.of(customer));
                when(userCredentialRepository.findByPhoneNumberAndUserType("+919876543210", UserType.RESTAURANT))
                                .thenReturn(Optional.empty());
                when(userCredentialRepository.save(any())).thenAnswer(inv -> {
                        UserCredential saved = inv.getArgument(0);
                        ReflectionTestUtils.setField(saved, "id", UUID.randomUUID());
                        return saved;
                });
                when(jwtTokenProvider.createAccessToken(any(), eq(UserType.RESTAURANT), isNull()))
                                .thenReturn("access-rest");
                when(jwtTokenProvider.accessTokenTtlSeconds()).thenReturn(900L);
                when(jwtTokenProvider.refreshTtlSeconds(UserType.RESTAURANT)).thenReturn(2592000L);
                when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

                TokenPairResponseDto response = authService.verifyOtp(
                                new VerifyOtpRequestDto("+919876543210", "482913", UserType.RESTAURANT, "device"));

                assertThat(response.isNewUser()).isTrue();
                assertThat(response.userType()).isEqualTo(UserType.RESTAURANT);
                assertThat(response.accessToken()).isEqualTo("access-rest");
                verify(eventPublisher).publishEvent(any(UserCredentialCreatedEvent.class));
        }

        @Test
        void authenticateWithGoogle_newCustomer_issuesTokenPair() {
                when(googleTokenVerifier.verify("id-token")).thenReturn(
                                new GoogleTokenVerifier.GoogleIdentity("google-sub-1", "user@example.com", true));
                when(userCredentialRepository.findByGoogleId("google-sub-1")).thenReturn(Optional.empty());
                when(userCredentialRepository.save(any())).thenAnswer(inv -> {
                        UserCredential saved = inv.getArgument(0);
                        ReflectionTestUtils.setField(saved, "id", UUID.randomUUID());
                        return saved;
                });
                when(jwtTokenProvider.createAccessToken(any(), eq(UserType.CUSTOMER), isNull())).thenReturn("access");
                when(jwtTokenProvider.accessTokenTtlSeconds()).thenReturn(900L);
                when(jwtTokenProvider.refreshTtlSeconds(UserType.CUSTOMER)).thenReturn(2592000L);
                when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

                TokenPairResponseDto response = authService.authenticateWithGoogle(
                                new GoogleAuthRequestDto("id-token", "Pixel"));

                assertThat(response.isNewUser()).isTrue();
                assertThat(response.userType()).isEqualTo(UserType.CUSTOMER);
                verify(eventPublisher).publishEvent(any(UserCredentialCreatedEvent.class));
        }

        @Test
        void loginAdmin_success_issuesTokenPairWithRole() {
                lenient().doNothing().when(rateLimiter).check(anyString(), anyInt(), any(Duration.class));
                UUID userId = UUID.randomUUID();
                UserCredential admin = UserCredential.adminProvisionWithPassword(
                                "+919999999999",
                                "admin@foodie.local",
                                passwordEncoder.encode("ChangeMe@123"));
                ReflectionTestUtils.setField(admin, "id", userId);

                when(userCredentialRepository.findByEmailIgnoreCaseAndUserType("admin@foodie.local", UserType.ADMIN))
                                .thenReturn(Optional.of(admin));
                when(adminIdentityQueryPort.findRoleNameByUserCredentialId(userId))
                                .thenReturn(Optional.of("SUPER_ADMIN"));
                when(jwtTokenProvider.createAccessToken(eq(userId), eq(UserType.ADMIN), eq("SUPER_ADMIN")))
                                .thenReturn("admin-access");
                when(jwtTokenProvider.accessTokenTtlSeconds()).thenReturn(900L);
                when(jwtTokenProvider.refreshTtlSeconds(UserType.ADMIN)).thenReturn(604800L);
                when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

                TokenPairResponseDto response = authService.loginAdmin(
                                new AdminLoginRequestDto("admin@foodie.local", "ChangeMe@123", "Admin Panel"));

                assertThat(response.accessToken()).isEqualTo("admin-access");
                assertThat(response.userType()).isEqualTo(UserType.ADMIN);
                assertThat(response.userId()).isEqualTo(userId);
                assertThat(response.role()).isEqualTo("SUPER_ADMIN");
                assertThat(response.isNewUser()).isFalse();
        }

        @Test
        void loginAdmin_invalidPassword_throwsUnauthorized() {
                lenient().doNothing().when(rateLimiter).check(anyString(), anyInt(), any(Duration.class));
                UUID userId = UUID.randomUUID();
                UserCredential admin = UserCredential.adminProvisionWithPassword(
                                "+919999999999",
                                "admin@foodie.local",
                                passwordEncoder.encode("ChangeMe@123"));
                ReflectionTestUtils.setField(admin, "id", userId);
                when(userCredentialRepository.findByEmailIgnoreCaseAndUserType("admin@foodie.local", UserType.ADMIN))
                                .thenReturn(Optional.of(admin));

                assertThatThrownBy(() -> authService.loginAdmin(
                                new AdminLoginRequestDto("admin@foodie.local", "WrongPassword", null)))
                                .isInstanceOf(UnauthorizedException.class)
                                .extracting(ex -> ((UnauthorizedException) ex).getErrorCode())
                                .isEqualTo(ErrorCode.UNAUTHORIZED);
        }

        @Test
        void loginAdmin_unknownEmail_throwsUnauthorized() {
                lenient().doNothing().when(rateLimiter).check(anyString(), anyInt(), any(Duration.class));
                when(userCredentialRepository.findByEmailIgnoreCaseAndUserType("missing@foodie.local", UserType.ADMIN))
                                .thenReturn(Optional.empty());

                assertThatThrownBy(() -> authService.loginAdmin(
                                new AdminLoginRequestDto("missing@foodie.local", "ChangeMe@123", null)))
                                .isInstanceOf(UnauthorizedException.class);
        }

        @Test
        void loginAdmin_disabled_throwsAccountDeactivated() {
                lenient().doNothing().when(rateLimiter).check(anyString(), anyInt(), any(Duration.class));
                UUID userId = UUID.randomUUID();
                UserCredential admin = UserCredential.adminProvisionWithPassword(
                                "+919999999999",
                                "admin@foodie.local",
                                passwordEncoder.encode("ChangeMe@123"));
                ReflectionTestUtils.setField(admin, "id", userId);
                admin.deactivate();
                when(userCredentialRepository.findByEmailIgnoreCaseAndUserType("admin@foodie.local", UserType.ADMIN))
                                .thenReturn(Optional.of(admin));

                assertThatThrownBy(() -> authService.loginAdmin(
                                new AdminLoginRequestDto("admin@foodie.local", "ChangeMe@123", null)))
                                .isInstanceOf(ForbiddenException.class)
                                .extracting(ex -> ((ForbiddenException) ex).getErrorCode())
                                .isEqualTo(ErrorCode.ACCOUNT_DEACTIVATED);
        }
}
