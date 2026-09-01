package com.foodie.restaurant.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "restaurant_bank_details")
public class RestaurantBankDetails extends BaseEntity {

    @Column(name = "restaurant_id", nullable = false, unique = true, updatable = false)
    private UUID restaurantId;

    @Column(name = "account_holder_name")
    private String accountHolderName;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "account_number")
    private String accountNumber;

    @Column(name = "ifsc_code", length = 30)
    private String ifscCode;

    @Column(name = "account_type", length = 20)
    private String accountType = "CURRENT";

    @Column(name = "branch_name")
    private String branchName;

    @Column(name = "verification_status", nullable = false, length = 20)
    private String verificationStatus = "NOT_SUBMITTED";

    @Column(name = "upi_id")
    private String upiId;

    @Column(name = "upi_verification_status", nullable = false, length = 20)
    private String upiVerificationStatus = "NOT_SUBMITTED";

    protected RestaurantBankDetails() {
    }

    public static RestaurantBankDetails createDefault(UUID restaurantId) {
        RestaurantBankDetails details = new RestaurantBankDetails();
        details.restaurantId = restaurantId;
        details.accountType = "CURRENT";
        details.verificationStatus = "NOT_SUBMITTED";
        details.upiVerificationStatus = "NOT_SUBMITTED";
        return details;
    }

    public void updateDetails(
            String accountHolderName,
            String bankName,
            String accountNumber,
            String ifscCode,
            String accountType,
            String branchName,
            String upiId
    ) {
        if (accountHolderName != null) this.accountHolderName = accountHolderName;
        if (bankName != null) this.bankName = bankName;
        if (accountNumber != null) {
            this.accountNumber = accountNumber;
            this.verificationStatus = "PENDING";
        }
        if (ifscCode != null) this.ifscCode = ifscCode;
        if (accountType != null) this.accountType = accountType;
        if (branchName != null) this.branchName = branchName;
        if (upiId != null) {
            this.upiId = upiId;
            this.upiVerificationStatus = "PENDING";
        }
    }

    public void verifyBankAccount() {
        this.verificationStatus = "VERIFIED";
    }

    public void verifyUpi(String newUpiId) {
        if (newUpiId != null && !newUpiId.isBlank()) {
            this.upiId = newUpiId;
        }
        this.upiVerificationStatus = "VERIFIED";
    }

    public UUID getRestaurantId() {
        return restaurantId;
    }

    public String getAccountHolderName() {
        return accountHolderName;
    }

    public String getBankName() {
        return bankName;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public String getIfscCode() {
        return ifscCode;
    }

    public String getAccountType() {
        return accountType != null ? accountType : "CURRENT";
    }

    public String getBranchName() {
        return branchName;
    }

    public String getVerificationStatus() {
        return verificationStatus != null ? verificationStatus : "NOT_SUBMITTED";
    }

    public String getUpiId() {
        return upiId;
    }

    public String getUpiVerificationStatus() {
        return upiVerificationStatus != null ? upiVerificationStatus : "NOT_SUBMITTED";
    }
}
