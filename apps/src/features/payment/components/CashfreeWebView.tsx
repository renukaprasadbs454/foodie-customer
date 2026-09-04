import React, { useRef } from 'react';
import { View, Linking, Modal } from 'react-native';
import { WebView } from 'react-native-webview';

interface CashfreeOptions {
    paymentSessionId: string;
    orderId: string;
    environment: 'sandbox' | 'production';
}

interface CashfreeWebViewProps {
    options: CashfreeOptions;
    onSuccess: (data: { orderId: string; cashfreeOrderId: string }) => void;
    onCancel: () => void;
    onError: (error: string) => void;
}

export function CashfreeWebView({
    options,
    onSuccess,
    onCancel,
    onError,
}: CashfreeWebViewProps) {
    const webViewRef = useRef<WebView>(null);

    const htmlContext = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
      <style>
        body, html { margin: 0; padding: 0; height: 100vh; background-color: #ffffff; display: flex; justify-content: center; align-items: center; }
        .spinner { width: 44px; height: 44px; border: 4px solid #e2e8f0; border-top: 4px solid #14532D; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div id="loader"><div class="spinner"></div><p style="font-family:sans-serif;font-weight:bold;margin-top:16px;">Loading Cashfree Checkout...</p></div>
      <script>
        function safePostMessage(dataObj) {
          try {
            if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              window.ReactNativeWebView.postMessage(JSON.stringify(dataObj));
            } else if (window.parent && typeof window.parent.postMessage === 'function') {
              window.parent.postMessage(JSON.stringify(dataObj), '*');
            }
          } catch(e) {}
        }

        function launchCheckout() {
          let attempts = 0;
          const checkInterval = setInterval(function() {
            attempts++;
            if (typeof Cashfree !== 'undefined') {
              clearInterval(checkInterval);
              try {
                const cf = Cashfree({ mode: "${options.environment}" });
                cf.checkout({
                  paymentSessionId: "${options.paymentSessionId}"
                }).then(function(result) {
                  if(result.error) {
                    if (result.error.message && result.error.message.includes('cancel')) {
                      safePostMessage({ type: 'cancel' });
                    } else {
                      safePostMessage({ type: 'error', data: result.error.message || 'Payment Failed' });
                    }
                  } else {
                    // Success or Redirect
                    safePostMessage({ 
                      type: 'success', 
                      data: {
                         orderId: "${options.orderId}",
                         cashfreeOrderId: "${options.orderId}"
                      } 
                    });
                  }
                });
                setTimeout(() => { document.getElementById('loader').style.display = 'none'; }, 500);
              } catch (err) {
                safePostMessage({ type: 'error', data: err.message || 'Could not launch Cashfree Checkout' });
              }
            } else if (attempts >= 60) {
              clearInterval(checkInterval);
              safePostMessage({ type: 'error', data: 'Cashfree SDK network load timeout.' });
            }
          }, 100);
        }

        window.onload = launchCheckout;
        setTimeout(launchCheckout, 300);
      </script>
    </body>
    </html>
  `;

    return (
        <Modal visible animationType="slide" transparent={false} onRequestClose={onCancel}>
            <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
                <WebView
                    ref={webViewRef}
                    source={{ html: htmlContext, baseUrl: 'https://sandbox.cashfree.com' }}
                    style={{ flex: 1 }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    originWhitelist={['*']}
                    mixedContentMode="always"
                    onShouldStartLoadWithRequest={(request) => {
                        const url = request.url;
                        if (
                            url.startsWith('upi://') ||
                            url.startsWith('phonepe://') ||
                            url.startsWith('gpay://') ||
                            url.startsWith('paytm://')
                        ) {
                            Linking.openURL(url).catch(() => { });
                            return false;
                        }
                        return true;
                    }}
                    onMessage={(event) => {
                        try {
                            const message = JSON.parse(event.nativeEvent.data);
                            if (message.type === 'success') {
                                onSuccess(message.data);
                            } else if (message.type === 'cancel') {
                                onCancel();
                            } else if (message.type === 'error') {
                                onError(message.data || 'Cashfree payment was unsuccessful.');
                            }
                        } catch (e) {
                            onError('Error communicating with Cashfree Gateway.');
                        }
                    }}
                />
            </View>
        </Modal>
    );
}
