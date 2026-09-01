package com.foodie.admin.service;

import com.foodie.admin.dto.request.CommissionConfigDto;
import com.foodie.admin.dto.response.PaymentSettlementResponseDto;
import com.foodie.admin.dto.response.PaymentSplitBreakdownDto;
import java.math.BigDecimal;
import java.util.List;

public interface AdminPaymentService {

    CommissionConfigDto getCommissionRules();

    CommissionConfigDto updateCommissionRules(CommissionConfigDto config);

    PaymentSplitBreakdownDto calculateSplit(BigDecimal foodSubtotal, BigDecimal deliveryFee);

    List<PaymentSettlementResponseDto> listSettlements();
}
