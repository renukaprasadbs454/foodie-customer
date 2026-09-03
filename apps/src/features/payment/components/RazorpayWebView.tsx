import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Linking, Modal, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface RazorpayOptions {
  key: string;
  amount: number; // in paise
  currency: string;
  order_id?: string;
  name?: string;
  description?: string;
  prefill?: {
    contact?: string;
    email?: string;
    method?: string;
  };
}

interface RazorpayWebViewProps {
  options: RazorpayOptions;
  onSuccess: (data: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

export function RazorpayWebView({
  options,
  onSuccess,
  onCancel,
  onError,
}: RazorpayWebViewProps) {
  const webViewRef = useRef<WebView>(null);

  // The actual Razorpay configuration coming from the backend/frontend params
  const rzpOptions: Record<string, any> = {
    key: options.key,
    amount: options.amount,
    currency: options.currency || 'INR',
    order_id: options.order_id,
    name: options.name || 'Foodie',
    description: options.description || 'Food Order Payment',
    prefill: {
      contact: options.prefill?.contact || '9876543210',
      email: options.prefill?.email || 'customer@foodie.com',
    },
    theme: {
      color: '#14532D',
    },
  };

  // Pure HTML that only loads the OFFICIAL Razorpay Checkout SDK.
  // No custom buttons. No fake payment logic.
  const htmlContext = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Razorpay Payment</title>
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          height: 100vh;
          width: 100vw;
          background-color: #ffffff;
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .loading-box {
          text-align: center;
          color: #1e293b;
        }
        .spinner {
          width: 44px;
          height: 44px;
          border: 4px solid #e2e8f0;
          border-top: 4px solid #14532D;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div id="loader" class="loading-box">
        <div class="spinner"></div>
        <p style="font-weight: 700; font-size: 16px;">Loading Razorpay Secure Checkout...</p>
      </div>

      <script>
        const config = ${JSON.stringify(rzpOptions)};
        
        function safePostMessage(dataObj) {
          try {
            if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              window.ReactNativeWebView.postMessage(JSON.stringify(dataObj));
            } else if (window.parent && typeof window.parent.postMessage === 'function') {
              window.parent.postMessage(JSON.stringify(dataObj), '*');
            }
          } catch(e) {
            console.error('PostMessage error:', e);
          }
        }

        // Setup successful payment handler
        config.handler = function(response) {
          safePostMessage({ 
            type: 'success', 
            data: {
              razorpay_payment_id: response.razorpay_payment_id || '',
              razorpay_order_id: response.razorpay_order_id || null,
              razorpay_signature: response.razorpay_signature || null
            } 
          });
        };
        
        // Setup modal close handler
        config.modal = {
          ondismiss: function() {
            safePostMessage({ type: 'cancel' });
          },
          animation: true,
          escape: false,
          backdropclose: false
        };

        function launchCheckout() {
          let attempts = 0;
          let launched = false;
          const checkInterval = setInterval(function() {
            attempts++;
            if (typeof Razorpay !== 'undefined') {
              if (launched) return;
              launched = true;
              clearInterval(checkInterval);
              try {
                const rzp = new Razorpay(config);
                rzp.on('payment.failed', function (response) {
                  var errObj = response.error || {};
                  var errDetails = (errObj.code ? errObj.code + ': ' : '') + (errObj.description || 'Payment Failed') + (errObj.reason ? ' (' + errObj.reason + ')' : '');
                  safePostMessage({ 
                    type: 'error', 
                    data: errDetails
                  });
                });
                rzp.open();
                setTimeout(function() {
                  const loader = document.getElementById('loader');
                  if (loader) loader.style.display = 'none';
                }, 500);
              } catch (err) {
                safePostMessage({ 
                  type: 'error', 
                  data: err.message || 'Could not launch Razorpay Checkout' 
                });
              }
            } else if (attempts >= 60) {
              clearInterval(checkInterval);
              safePostMessage({ type: 'error', data: 'Razorpay SDK network load timeout. Please check internet connection.' });
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
          source={{ html: htmlContext, baseUrl: 'https://checkout.razorpay.com' }}
          style={{ flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          mixedContentMode="always"
          thirdPartyCookiesEnabled={true}
          allowFileAccess={true}
          allowsInlineMediaPlayback={true}
          onShouldStartLoadWithRequest={(request) => {
            const url = request.url;

            // Handle UPI and Deep Links to native banking apps
            if (
              url.startsWith('upi://') ||
              url.startsWith('phonepe://') ||
              url.startsWith('gpay://') ||
              url.startsWith('paytm://') ||
              url.startsWith('tez://') ||
              url.startsWith('intent://')
            ) {
              Linking.openURL(url).catch(() => {
                console.warn('Could not open native payments app for URL:', url);
              });
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
                onError(message.data || 'Razorpay payment was unsuccessful.');
              }
            } catch (e) {
              onError('Error communicating with Razorpay Gateway.');
            }
          }}
        />
      </View>
    </Modal>
  );
}
