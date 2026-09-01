package com.foodie.delivery.service.impl;

import com.foodie.delivery.repository.DeliveryPartnerRepository;
import com.foodie.shared.contract.DeliveryPartnerLookup;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DeliveryPartnerLookupImpl implements DeliveryPartnerLookup {

    private final DeliveryPartnerRepository deliveryPartnerRepository;

    public DeliveryPartnerLookupImpl(DeliveryPartnerRepository deliveryPartnerRepository) {
        this.deliveryPartnerRepository = deliveryPartnerRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UUID> findPartnerIdByUserCredentialId(UUID userCredentialId) {
        return deliveryPartnerRepository.findByUserCredentialId(userCredentialId)
                .map(partner -> partner.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(UUID deliveryPartnerId) {
        return deliveryPartnerRepository.existsById(deliveryPartnerId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UUID> findUserCredentialIdByPartnerId(UUID deliveryPartnerId) {
        return deliveryPartnerRepository.findById(deliveryPartnerId)
                .map(partner -> partner.getUserCredentialId());
    }
}
