import React, { forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { View } from 'react-native';

export interface WebViewProps {
  source?: { uri?: string; html?: string; baseUrl?: string };
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
  style?: any;
  [key: string]: any;
}

export const WebView = forwardRef<any, WebViewProps>((props, ref) => {
  const { source, onMessage, style } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useImperativeHandle(ref, () => ({
    postMessage: (data: string) => {
      try {
        iframeRef.current?.contentWindow?.postMessage(data, '*');
      } catch (_e) {}
    },
    injectJavaScript: (_script: string) => {},
    reload: () => {
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src;
      }
    },
    goBack: () => {},
    goForward: () => {},
  }));

  useEffect(() => {
    const handleWindowMessage = (e: MessageEvent) => {
      if (onMessage && e.data) {
        const dataStr = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
        onMessage({ nativeEvent: { data: dataStr } });
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleWindowMessage);
      return () => window.removeEventListener('message', handleWindowMessage);
    }
  }, [onMessage]);

  const srcDoc = source?.html;
  const src = source?.uri;

  return (
    <View style={[{ flex: 1 }, style]}>
      <iframe
        ref={iframeRef}
        src={src}
        srcDoc={srcDoc}
        style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </View>
  );
});

WebView.displayName = 'WebViewWebMock';

export default WebView;
