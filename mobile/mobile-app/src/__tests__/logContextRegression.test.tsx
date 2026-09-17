/**
 * @jest-environment jsdom
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { useLogs, LogContext } from '@expo/metro-runtime/src/error-overlay/Data/LogContext';
import { LogBoxLog } from '@expo/metro-runtime/src/error-overlay/Data/LogBoxLog';

describe('LogContext Runtime Safety & Regression Suite', () => {
  beforeEach(() => {
    const el = document.getElementById('_expo-static-error');
    if (el) el.remove();
  });

  afterEach(() => {
    const el = document.getElementById('_expo-static-error');
    if (el) el.remove();
  });

  it('should safely parse double-stringified JSON without throwing Cannot read properties of undefined map', () => {
    const rawLogData = {
      level: 'static',
      message: { content: 'Metro Error: SyntaxError in Root Component', substitutions: [] },
      isComponentError: false,
      stack: [],
      category: 'static',
      componentStack: [],
    };

    const logBoxContext = {
      selectedLogIndex: 0,
      isDisabled: false,
      logs: [rawLogData],
    };

    // Exactly replicating metroErrorInterface.js lines 347-348:
    const serializedLogBox = JSON.stringify(logBoxContext).replace(/</g, '\\u003c');
    const doubleStringifiedJson = JSON.stringify(serializedLogBox);

    const script = document.createElement('script');
    script.id = '_expo-static-error';
    script.type = 'application/json';
    script.textContent = doubleStringifiedJson;
    document.body.appendChild(script);

    let capturedLogs: any = null;
    function Consumer() {
      capturedLogs = useLogs();
      return null;
    }

    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<Consumer />);
    });

    expect(capturedLogs).toBeDefined();
    expect(capturedLogs.selectedLogIndex).toBe(0);
    expect(capturedLogs.isDisabled).toBe(false);
    expect(Array.isArray(capturedLogs.logs)).toBe(true);
    expect(capturedLogs.logs.length).toBe(1);
    expect(capturedLogs.logs[0]).toBeInstanceOf(LogBoxLog);
    expect(capturedLogs.logs[0].message.content).toBe('Metro Error: SyntaxError in Root Component');
  });

  it('should gracefully handle malformed or undefined logs array without crashing', () => {
    const malformedPayload = JSON.stringify({
      selectedLogIndex: 0,
      isDisabled: false,
      // logs is completely undefined
    });

    const script = document.createElement('script');
    script.id = '_expo-static-error';
    script.type = 'application/json';
    script.textContent = malformedPayload;
    document.body.appendChild(script);

    let capturedLogs: any = null;
    function Consumer() {
      capturedLogs = useLogs();
      return null;
    }

    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<Consumer />);
    });

    expect(capturedLogs).toBeDefined();
    expect(capturedLogs.logs).toEqual([]);
    expect(capturedLogs.selectedLogIndex).toBe(0);
  });

  it('should return context value when used within LogContext.Provider', () => {
    const mockLog = new LogBoxLog({
      level: 'warn',
      message: { content: 'Warning message', substitutions: [] },
      isComponentError: false,
      stack: [],
      category: 'warn',
      componentStack: [],
    });

    const contextValue = {
      selectedLogIndex: 0,
      isDisabled: false,
      logs: [mockLog],
    };

    let capturedLogs: any = null;
    function Consumer() {
      capturedLogs = useLogs();
      return null;
    }

    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(
        <LogContext.Provider value={contextValue}>
          <Consumer />
        </LogContext.Provider>
      );
    });

    expect(capturedLogs).toBe(contextValue);
    expect(capturedLogs.logs[0].message.content).toBe('Warning message');
  });
});
