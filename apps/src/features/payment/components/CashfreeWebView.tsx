import React, { useRef } from 'react';
import { View, Modal, Platform, Pressable, Text } from 'react-native';
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

  const envMode = options.environment === 'production' ? 'production' : 'sandbox';

  const htmlContext = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
      <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100vh; background-color: #ffffff; display: flex; flex-direction: column; justify-content: center; align-items: center; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
        .spinner { width: 44px; height: 44px; border: 4px solid #e2e8f0; border-top: 4px solid #14532D; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div id="loader" style="text-align:center;">
        <div class="spinner" style="margin:0 auto 16px;"></div>
        <p style="font-weight:700; color:#14532D; margin:0;">Connecting to Cashfree Gateway...</p>
        <p style="font-size:12px; color:#64748b; margin-top:4px;">Please wait...</p>
      </div>

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

        function initCashfree() {
          let attempts = 0;
          const maxAttempts = 100;
          const checkInterval = setInterval(function() {
            attempts++;
            if (typeof Cashfree !== 'undefined') {
              clearInterval(checkInterval);
              try {
                const cashfree = Cashfree({ mode: "${envMode}" });
                cashfree.checkout({
                  paymentSessionId: "${options.paymentSessionId}",
                  redirectTarget: "_self"
                }).then(function(result) {
                  if (result && result.error) {
                    if (result.error.message && result.error.message.toLowerCase().includes('cancel')) {
                      safePostMessage({ type: 'cancel' });
                    } else {
                      safePostMessage({ type: 'error', data: result.error.message || 'Payment Failed' });
                    }
                  } else if (result && result.paymentDetails) {
                    safePostMessage({ 
                      type: 'success', 
                      data: {
                         orderId: "${options.orderId}",
                         cashfreeOrderId: "${options.orderId}"
                      } 
                    });
                  }
                });
                setTimeout(function() {
                  const l = document.getElementById('loader');
                  if (l) l.style.display = 'none';
                }, 1500);
              } catch(err) {
                safePostMessage({ type: 'error', data: err.message || 'SDK Init Error' });
              }
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
              safePostMessage({ type: 'error', data: 'Cashfree SDK failed to load. Please check internet connection.' });
            }
          }, 100);
        }

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          initCashfree();
        } else {
          window.addEventListener('DOMContentLoaded', initCashfree);
        }
      </script>
    </body>
    </html>
  `;

  const handleNavigationStateChange = (navState: any) => {
    const url = navState.url || '';
    if (url.includes('/payments/cashfree/return') || url.includes('order_status=PAID') || url.includes('status=SUCCESS')) {
      onSuccess({ orderId: options.orderId, cashfreeOrderId: options.orderId });
    } else if (url.includes('status=FAILED') || url.includes('status=CANCELLED')) {
      onCancel();
    }
  };

  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <View style={{ height: 50, backgroundColor: '#14532D', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16 }}>Cashfree Payment Gateway</Text>
          <Pressable onPress={onCancel} style={{ padding: 8 }}>
            <Text style={{ color: '#FCD34D', fontWeight: '800', fontSize: 14 }}>✕ Close</Text>
          </Pressable>
        </View>
        <WebView
          ref={webViewRef}
          source={{ html: htmlContext, baseUrl: 'https://sandbox.cashfree.com' }}
          style={{ flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          mixedContentMode="always"
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={(event) => {
            try {
              const message = JSON.parse(event.nativeEvent.data);
              if (message.type === 'success') {
                onSuccess(message.data);
              } else if (message.type === 'cancel') {
                onCancel();
              } else if (message.type === 'error') {
                onError(message.data || 'Cashfree payment failed.');
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
