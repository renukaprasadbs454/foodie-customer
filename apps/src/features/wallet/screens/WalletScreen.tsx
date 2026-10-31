import React, { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    View,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text, trackAnalyticsEvent, useTheme, EmptyState } from 'foodie-shared-rn';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useGetWalletBalanceQuery, useGetWalletLedgerQuery } from '../../../api/endpoints/walletApi';
import type { ProfileStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Wallet'>;

function formatMoney(val: string | number): string {
    const num = Number(val);
    return isNaN(num) ? '0.00' : num.toFixed(2);
}

export function WalletScreen({ navigation }: Props) {
    const { tokens } = useTheme();
    const [page, setPage] = useState(0);

    const balanceQuery = useGetWalletBalanceQuery();
    const ledgerQuery = useGetWalletLedgerQuery({
        page,
        size: 20,
        sort: '-createdAt',
    });

    const balance = Number(balanceQuery.data?.balance || 0);
    const transactions = ledgerQuery.data?.items || [];
    const isLoading = balanceQuery.isFetching || ledgerQuery.isFetching;

    React.useEffect(() => {
        trackAnalyticsEvent('customer_wallet_viewed');
    }, []);

    const handleRefresh = () => {
        setPage(0);
        void balanceQuery.refetch();
        void ledgerQuery.refetch();
    };

    const renderTransaction = ({ item }: { item: any }) => {
        const isCredit = item.type === 'CREDIT';
        const amountColor = isCredit ? '#10B981' : '#EF4444';
        const sign = isCredit ? '+' : '-';
        const iconName = isCredit ? 'arrow-down-left' : 'arrow-up-right';

        return (
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#131F18',
                padding: 16,
                marginBottom: 10,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(252, 211, 77, 0.15)',
            }}>
                <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: isCredit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                    borderWidth: 1,
                    borderColor: isCredit ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                }}>
                    <Feather name={iconName} size={20} color={amountColor} />
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                        {item.referenceType === 'ORDER_PAYMENT' ? 'Order Payment' :
                            item.referenceType === 'REFUND' ? 'Refund' :
                                item.referenceType === 'DEPOSIT' ? 'Deposit' : item.referenceType}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#9CA3AF' }}>
                        {new Date(item.createdAt).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                    </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: amountColor }}>
                        {sign}₹{formatMoney(item.amount)}
                    </Text>
                    {item.referenceId && item.referenceType === 'ORDER_PAYMENT' && (
                        <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Order ID</Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#012B18' }} edges={['top', 'left', 'right']}>
            <StatusBar backgroundColor="#012B18" barStyle="light-content" />

            {/* Header */}
            <LinearGradient
                colors={['#012B18', '#053E23', '#0A4D2E']}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(252, 211, 77, 0.2)',
                }}
            >
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={({ pressed }) => ({
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: pressed ? 'rgba(252, 211, 77, 0.2)' : 'rgba(252, 211, 77, 0.1)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(252, 211, 77, 0.3)',
                    })}
                >
                    <Feather name="arrow-left" size={20} color="#FCD34D" />
                </Pressable>
                <Text style={{ marginLeft: 16, fontSize: 20, fontWeight: '900', color: '#FCD34D' }}>
                    My Wallet
                </Text>
            </LinearGradient>

            <View style={{ flex: 1, backgroundColor: '#0A120E' }}>
                <FlatList
                    data={transactions}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTransaction}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    refreshControl={
                        <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor="#FCD34D" />
                    }
                    ListHeaderComponent={
                        <View style={{ marginBottom: 24 }}>
                            {/* Balance Card */}
                            <LinearGradient
                                colors={['#012B18', '#053E23', '#0A4D2E']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{
                                    borderRadius: 24,
                                    padding: 24,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: 0.4,
                                    shadowRadius: 16,
                                    elevation: 10,
                                    marginBottom: 24,
                                    borderWidth: 1.5,
                                    borderColor: '#FCD34D',
                                }}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <View style={{ backgroundColor: 'rgba(252, 211, 77, 0.2)', padding: 6, borderRadius: 8 }}>
                                            <Feather name="credit-card" size={16} color="#FCD34D" />
                                        </View>
                                        <Text style={{ color: '#FCD34D', fontWeight: '800', fontSize: 15, letterSpacing: 1 }}>
                                            FOODIE WALLET
                                        </Text>
                                    </View>
                                    <Feather name="shield" size={20} color="#FCD34D" style={{ opacity: 0.9 }} />
                                </View>

                                <Text style={{ color: '#9CA3AF', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
                                    Available Balance
                                </Text>

                                <View style={{ alignItems: 'flex-start', paddingVertical: 18 }}>
                                    <Text
                                        style={{ color: '#FCD34D', fontSize: 44, fontWeight: '900', letterSpacing: -1 }}
                                        adjustsFontSizeToFit
                                        numberOfLines={1}
                                    >
                                        ₹{formatMoney(balance)}
                                    </Text>
                                </View>

                                <View style={{
                                    marginTop: 16,
                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                    paddingVertical: 10,
                                    paddingHorizontal: 14,
                                    borderRadius: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                    borderWidth: 1,
                                    borderColor: 'rgba(252, 211, 77, 0.2)',
                                }}>
                                    <Feather name="info" size={14} color="#FCD34D" />
                                    <Text style={{ color: '#E5E7EB', fontSize: 13, flex: 1, lineHeight: 18 }}>
                                        Wallet balance can be applied securely at checkout.
                                    </Text>
                                </View>
                            </LinearGradient>

                            <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginLeft: 4, marginBottom: 8 }}>
                                Recent Transactions
                            </Text>
                        </View>
                    }
                    ListEmptyComponent={
                        !isLoading ? (
                            <View style={{ marginTop: 40, alignItems: 'center', padding: 24, backgroundColor: '#131F18', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(252, 211, 77, 0.2)' }}>
                                <Feather name="inbox" size={40} color="#FCD34D" style={{ marginBottom: 12 }} />
                                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800', textAlign: 'center' }}>No Transactions</Text>
                                <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 16 }}>Your wallet history is clean. Transactions will appear here.</Text>
                                <Pressable
                                    onPress={handleRefresh}
                                    style={{
                                        backgroundColor: '#FCD34D',
                                        paddingHorizontal: 20,
                                        paddingVertical: 10,
                                        borderRadius: 20,
                                    }}
                                >
                                    <Text style={{ color: '#012B18', fontWeight: '800', fontSize: 14 }}>Refresh</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <ActivityIndicator size="large" color="#FCD34D" style={{ marginTop: 40 }} />
                        )
                    }
                />
            </View>
        </SafeAreaView>
    );
}
