const fs = require('fs');

const filePath = 'c:/Users/hp/OneDrive/Desktop/foodie/foodie-customer/apps/src/features/checkout/screens/CheckoutScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startTag = '{/* Coupon Section */}';
const endTag = '{/* Wallet Section */}';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
    console.log("Tags not found");
    process.exit(1);
}

const replacement = `{/* Coupon Section */}
                  {couponsQuery.data && couponsQuery.data.length > 0 && (
                    <View style={{
                      backgroundColor: '#FFFFFF',
                      padding: 16,
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: appliedCoupon ? '#22C55E' : '#E5E7EB',
                      borderStyle: appliedCoupon ? 'solid' : 'dashed',
                      shadowColor: '#14532D',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.04,
                      shadowRadius: 10,
                      elevation: 2,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: appliedCoupon ? '#DCFCE7' : '#F3F4F6',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12
                        }}>
                          <Text style={{ fontSize: 16, color: appliedCoupon ? '#166534' : '#374151' }}>%</Text>
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          {appliedCoupon ? (
                            <>
                              <Text style={{ fontWeight: '800', fontSize: 14, color: '#111827' }}>
                                Save ₹{formatMoney(appliedCoupon.discountAmount)} with '{appliedCoupon.code}'
                              </Text>
                              <Pressable onPress={() => setShowCouponsModal(true)} style={{ marginTop: 2 }}>
                                <Text style={{ color: '#059669', fontSize: 13, fontWeight: '700' }}>View all coupons ▸</Text>
                              </Pressable>
                            </>
                          ) : (
                            <>
                              <Text style={{ fontWeight: '800', fontSize: 14, color: '#111827' }}>
                                Apply a coupon
                              </Text>
                              <Pressable onPress={() => setShowCouponsModal(true)} style={{ marginTop: 2 }}>
                                <Text style={{ color: '#059669', fontSize: 13, fontWeight: '700' }}>View all coupons ▸</Text>
                              </Pressable>
                            </>
                          )}
                        </View>
                      </View>

                      <Pressable 
                        onPress={() => setShowCouponsModal(true)} 
                        style={({ pressed }) => ({
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 12,
                          borderWidth: 1,
                          opacity: pressed ? 0.8 : 1,
                          borderColor: '#14532D',
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: appliedCoupon ? '#F9FAFB' : '#14532D',
                        })}
                      >
                        <Text style={{ 
                          color: appliedCoupon ? '#14532D' : '#FCD34D', 
                          fontWeight: '800', 
                          fontSize: 12,
                          letterSpacing: 0.5
                        }}>
                          {appliedCoupon ? 'CHANGE' : 'APPLY'}
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  `;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log("Successfully replaced coupon section.");
