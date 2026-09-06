import React, { useRef, useCallback, useMemo } from 'react';
import { View, Modal, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { X, ShieldCheck } from 'lucide-react-native';

export interface RazorpayCheckoutOptions {
  razorpayKeyId: string;
  orderId: string;
  paymentId: string; // Backend Payment record DB _id
  amount: number; // Amount in INR Rupees
  currency?: string;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

export interface RazorpaySuccessPayload {
  paymentId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export interface RazorpayErrorPayload {
  code: string;
  description: string;
  source?: string;
  step?: string;
  reason?: string;
}

export interface RazorpayCheckoutModalProps {
  visible: boolean;
  options: RazorpayCheckoutOptions | null;
  onSuccess: (result: RazorpaySuccessPayload) => Promise<void> | void;
  onDismiss: (reason?: string) => void;
  onError: (error: RazorpayErrorPayload) => void;
}

export function RazorpayCheckoutModal({
  visible,
  options,
  onSuccess,
  onDismiss,
  onError,
}: RazorpayCheckoutModalProps) {
  const isHandledRef = useRef<boolean>(false);

  // Reset handled lock when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      isHandledRef.current = false;
    }
  }, [visible]);

  // Construct HTML wrapper for Razorpay Checkout
  const htmlContent = useMemo(() => {
    if (!options) return '';

    const key = options.razorpayKeyId || '';
    const orderId = options.orderId || '';
    const amountPaise = Math.round(options.amount * 100);
    const currency = options.currency || 'INR';
    const name = 'ManageMyGate Billing';
    const description = options.description || `Invoice Settlement (₹${options.amount})`;
    const customerName = options.customerName || 'Resident';
    const customerPhone = options.customerPhone || '';
    const customerEmail = options.customerEmail || '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <style>
            body {
              margin: 0;
              padding: 0;
              background-color: hsl(222.2, 84%, 4.9%);
              color: hsl(210, 40%, 98%);
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
            }
            .spinner {
              border: 3px solid hsla(217.2, 91.2%, 59.8%, 0.2);
              border-top: 3px solid hsl(217.2, 91.2%, 59.8%);
              border-radius: 50%;
              width: 36px;
              height: 36px;
              animation: spin 1s linear infinite;
              margin-bottom: 16px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .text {
              font-size: 14px;
              font-weight: 600;
              color: hsl(215, 20.2%, 65.1%);
            }
          </style>
          <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        </head>
        <body>
          <div class="spinner"></div>
          <div class="text">Connecting to Secure Razorpay Gateway...</div>

          <script>
            function sendToRN(type, data) {
              var payload = JSON.stringify({ type, data });
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(payload);
              } else if (window.parent && window.parent !== window) {
                window.parent.postMessage(payload, '*');
              }
            }

            try {
              var razorpayOptions = {
                key: "${key}",
                amount: "${amountPaise}",
                currency: "${currency}",
                name: "${name}",
                description: "${description}",
                order_id: "${orderId}",
                handler: function(response) {
                  sendToRN('PAYMENT_SUCCESS', {
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature
                  });
                },
                prefill: {
                  name: "${customerName}",
                  contact: "${customerPhone}",
                  email: "${customerEmail}"
                },
                modal: {
                  ondismiss: function() {
                    sendToRN('PAYMENT_CANCELLED', { reason: 'User dismissed Razorpay modal' });
                  }
                },
                theme: {
                  color: '#2563eb'
                }
              };

              var rzp = new Razorpay(razorpayOptions);
              
              rzp.on('payment.failed', function(response) {
                sendToRN('PAYMENT_ERROR', {
                  code: response.error.code,
                  description: response.error.description,
                  source: response.error.source,
                  step: response.error.step,
                  reason: response.error.reason
                });
              });

              rzp.open();
            } catch (err) {
              sendToRN('PAYMENT_ERROR', {
                code: 'INIT_ERROR',
                description: err.message || 'Failed to initialize Razorpay checkout script'
              });
            }
          </script>
        </body>
      </html>
    `;
  }, [options]);

  const handleMessage = useCallback(
    (event: any) => {
      if (isHandledRef.current) return;

      try {
        const raw = event.nativeEvent.data;
        const parsed = JSON.parse(raw);
        const { type, data } = parsed;

        if (type === 'PAYMENT_SUCCESS') {
          isHandledRef.current = true;
          onSuccess({
            paymentId: options?.paymentId || '',
            razorpayPaymentId: data.razorpay_payment_id,
            razorpayOrderId: data.razorpay_order_id || options?.orderId || '',
            razorpaySignature: data.razorpay_signature,
          });
        } else if (type === 'PAYMENT_CANCELLED') {
          isHandledRef.current = true;
          onDismiss(data?.reason || 'User cancelled checkout');
        } else if (type === 'PAYMENT_ERROR') {
          isHandledRef.current = true;
          onError({
            code: data?.code || 'PAYMENT_FAILED',
            description: data?.description || 'Razorpay checkout encountered an error',
            source: data?.source,
            step: data?.step,
            reason: data?.reason,
          });
        }
      } catch (err) {
        console.error('Failed to parse WebView message:', err);
      }
    },
    [options, onSuccess, onDismiss, onError]
  );

  // Web browser message listener
  React.useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      const handleWebMessage = (event: MessageEvent) => {
        if (typeof event.data === 'string' && event.data.includes('PAYMENT_')) {
          handleMessage({ nativeEvent: { data: event.data } });
        }
      };
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [visible, handleMessage]);

  if (!visible || !options) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        if (!isHandledRef.current) {
          isHandledRef.current = true;
          onDismiss('User pressed back button');
        }
      }}
    >
      <View className="flex-1 bg-background">
        {/* Modal Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-card pt-12">
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center me-2.5">
              <Icon as={ShieldCheck} size={18} className="text-primary" />
            </View>
            <View>
              <Text className="font-bold text-sm text-foreground">Razorpay Secure Checkout</Text>
              <Text className="text-xs text-muted-foreground">Order #{options.orderId.slice(-8)}</Text>
            </View>
          </View>

          <Button
            variant="ghost"
            size="icon"
            onPress={() => {
              if (!isHandledRef.current) {
                isHandledRef.current = true;
                onDismiss('User closed checkout modal');
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Close Razorpay Modal"
          >
            <Icon as={X} size={18} className="text-muted-foreground" />
          </Button>
        </View>

        {/* WebView Gateway Container */}
        <View className="flex-1 bg-background">
          {Platform.OS === 'web' ? (
            <iframe
              srcDoc={htmlContent}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Razorpay Gateway Web"
            />
          ) : (
            <WebView
              originWhitelist={['*']}
              source={{ html: htmlContent, baseUrl: 'https://checkout.razorpay.com' }}
              onMessage={handleMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              thirdPartyCookiesEnabled={true}
              mixedContentMode="always"
              startInLoadingState={true}
              renderLoading={() => (
                <View className="absolute inset-0 bg-background items-center justify-center">
                  <View className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <Text className="text-xs text-muted-foreground mt-3 font-semibold">
                    Loading Payment Gateway…
                  </Text>
                </View>
              )}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                if (!isHandledRef.current) {
                  isHandledRef.current = true;
                  onError({
                    code: 'WEBVIEW_LOAD_ERROR',
                    description: nativeEvent.description || 'WebView failed to load Razorpay checkout.',
                  });
                }
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

export default RazorpayCheckoutModal;

