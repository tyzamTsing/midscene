import './App.less';
import './index.less';

import { CaretRightOutlined } from '@ant-design/icons';
import { Alert, Button, ConfigProvider, Empty } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

import { antiEscapeScriptTag } from '@midscene/shared/utils';
import { Logo, Player, globalThemeConfig } from '@midscene/visualizer';
import { PlaywrightCaseSelector } from './components/PlaywrightCaseSelector';
import DetailPanel from './components/detail-panel';
import DetailSide from './components/detail-side';
import GlobalHoverPreview from './components/global-hover-preview';
import Sidebar from './components/sidebar';
import { useExecutionDump } from './components/store';
import Timeline from './components/timeline';
import type {
  ExecutionDumpWithPlaywrightAttributes,
  StoreState,
  VisualizerProps,
} from './types';

let globalRenderCount = 1;

function Visualizer(props: VisualizerProps): JSX.Element {
  const { dumps } = props;

  const executionDump = useExecutionDump((store: StoreState) => store.dump);
  const executionDumpLoadId = useExecutionDump(
    (store: StoreState) => store._executionDumpLoadId,
  );

  const setReplayAllMode = useExecutionDump(
    (store: StoreState) => store.setReplayAllMode,
  );
  const replayAllScripts = useExecutionDump(
    (store: StoreState) => store.allExecutionAnimation,
  );
  const insightWidth = useExecutionDump(
    (store: StoreState) => store.insightWidth,
  );
  const insightHeight = useExecutionDump(
    (store: StoreState) => store.insightHeight,
  );
  const replayAllMode = useExecutionDump(
    (store: StoreState) => store.replayAllMode,
  );
  const setGroupedDump = useExecutionDump(
    (store: StoreState) => store.setGroupedDump,
  );
  const reset = useExecutionDump((store: StoreState) => store.reset);
  const [mainLayoutChangeFlag, setMainLayoutChangeFlag] = useState(0);
  const mainLayoutChangedRef = useRef(false);
  const dump = useExecutionDump((store: StoreState) => store.dump);

  useEffect(() => {
    if (dumps) {
      setGroupedDump(dumps[0]);
    }
    return () => {
      reset();
    };
  }, [dumps, reset, setGroupedDump]);

  useEffect(() => {
    let resizeThrottler = false;
    const onResize = () => {
      if (resizeThrottler) {
        return;
      }
      resizeThrottler = true;
      setTimeout(() => {
        resizeThrottler = false;
        setMainLayoutChangeFlag((prev) => prev + 1);
      }, 300);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  let mainContent: JSX.Element;
  if (dump && dump.executions.length === 0) {
    mainContent = (
      <div className="main-right">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="There is no task info in this dump file."
        />
      </div>
    );
  } else if (!executionDump) {
    mainContent = (
      <div className="main-right">
        <div
          className="center-content"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Empty description="Loading report content..." />
        </div>
      </div>
    );
  } else {
    const content = replayAllMode ? (
      <div className="replay-all-mode-wrapper">
        <Player
          key={`${executionDumpLoadId}`}
          replayScripts={replayAllScripts!}
          imageWidth={insightWidth!}
          imageHeight={insightHeight!}
        />
      </div>
    ) : (
      <PanelGroup autoSaveId="page-detail-layout-v2" direction="horizontal">
        <Panel defaultSize={75} maxSize={95}>
          <div className="main-content-container">
            <DetailPanel />
          </div>
        </Panel>
        <PanelResizeHandle />
        <Panel maxSize={95}>
          <div className="main-side">
            <DetailSide />
          </div>
        </Panel>
      </PanelGroup>
    );

    mainContent = (
      <PanelGroup
        autoSaveId="main-page-layout"
        direction="horizontal"
        onLayout={() => {
          if (!mainLayoutChangedRef.current) {
            setMainLayoutChangeFlag((prev) => prev + 1);
          }
        }}
      >
        <Panel maxSize={95} defaultSize={20}>
          <div className="page-side">
            <Sidebar />
          </div>
        </Panel>
        <PanelResizeHandle
          onDragging={(isChanging) => {
            if (mainLayoutChangedRef.current && !isChanging) {
              setMainLayoutChangeFlag((prev) => prev + 1);
            }
            mainLayoutChangedRef.current = isChanging;
          }}
        />
        <Panel defaultSize={80} maxSize={95}>
          <div className="main-right">
            <Timeline key={mainLayoutChangeFlag} />
            <div className="main-content">{content}</div>
          </div>
        </Panel>
      </PanelGroup>
    );
  }

  const [containerHeight, setContainerHeight] = useState('100%');
  useEffect(() => {
    const ifInRspressPage = document.querySelector('.rspress-nav');

    const navHeightKey = '--rp-nav-height';
    const originalNavHeight = getComputedStyle(
      document.documentElement,
    ).getPropertyValue(navHeightKey);

    if (ifInRspressPage) {
      const newNavHeight = '42px';
      setContainerHeight(`calc(100vh - ${newNavHeight})`);
      document.documentElement.style.setProperty(navHeightKey, newNavHeight);
    }

    return () => {
      if (ifInRspressPage) {
        document.documentElement.style.setProperty(
          navHeightKey,
          originalNavHeight,
        );
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      globalRenderCount += 1;
    };
  }, []);

  return (
    <ConfigProvider theme={globalThemeConfig()}>
      {/* <Helmet>
        <title>Report - Midscene.js</title>
      </Helmet> */}
      <div
        className="page-container"
        key={`render-${globalRenderCount}`}
        style={{ height: containerHeight }}
      >
        <div className="page-nav">
          <div className="page-nav-left">
            <Logo />
            <div className="page-nav-toolbar">
              <ConfigProvider
                theme={{
                  components: {
                    Button: { textHoverBg: '#bfc4da80' },
                  },
                }}
              >
                <Button
                  type="text"
                  icon={<CaretRightOutlined />}
                  disabled={!replayAllScripts || replayAllScripts.length === 0}
                  style={{
                    background: replayAllMode ? '#bfc4da80' : undefined,
                  }}
                  onClick={() => {
                    setReplayAllMode(true);
                  }}
                >
                  Replay All
                </Button>
              </ConfigProvider>
            </div>
          </div>
          <PlaywrightCaseSelector
            dumps={props.dumps}
            selected={executionDump}
            onSelect={(dump) => {
              setGroupedDump(dump);
            }}
          />
        </div>
        {mainContent}
      </div>
      <GlobalHoverPreview />
    </ConfigProvider>
  );
}

export function App() {
  function getDumpElements(): ExecutionDumpWithPlaywrightAttributes[] {
    const dumpElements = document.querySelectorAll(
      'script[type="midscene_web_dump"]',
    );
    const reportDump: ExecutionDumpWithPlaywrightAttributes[] = [];
    Array.from(dumpElements)
      .filter((el) => {
        const textContent = el.textContent;
        if (!textContent) {
          console.warn('empty content in script tag', el);
        }
        return !!textContent;
      })
      .forEach((el) => {
        const attributes: Record<string, any> = {};
        Array.from(el.attributes).forEach((attr) => {
          const { name, value } = attr;
          const valueDecoded = decodeURIComponent(value);
          if (name.startsWith('playwright_')) {
            attributes[attr.name] = valueDecoded;
          }
        });
        const content = antiEscapeScriptTag(el.textContent || '');
        try {
          const jsonContent = JSON.parse(content);
          jsonContent.attributes = attributes;
          reportDump.push(jsonContent);
        } catch (e) {
          console.error(el);
          console.error('failed to parse json content', e);
        }
      });
    return reportDump;
  }

  const [reportDump, setReportDump] = useState<
    ExecutionDumpWithPlaywrightAttributes[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const loadDumpElements = useCallback(() => {
    const dumpElements = document.querySelectorAll(
      'script[type="midscene_web_dump"]',
    );
    if (
      dumpElements.length === 1 &&
      dumpElements[0].textContent?.trim() === ''
    ) {
      setError('There is no dump data to display.');
      setReportDump([]);
      return;
    }
    setError(null);
    setReportDump(getDumpElements());
  }, []);

  useEffect(() => {
    // Check if document is already loaded
    const loadDumps = () => {
      console.log('Loading dump elements...');
      loadDumpElements();
    };

    // If DOM is already loaded (React mounts after DOMContentLoaded in most cases)
    if (
      document.readyState === 'complete' ||
      document.readyState === 'interactive'
    ) {
      // Use a small timeout to ensure all scripts are parsed
      setTimeout(loadDumps, 0);
    } else {
      // Wait for DOM content to be fully loaded
      document.addEventListener('DOMContentLoaded', loadDumps);
    }

    // Set up a MutationObserver to detect if dump scripts are added after initial load
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          const hasDumpScripts = addedNodes.some(
            (node) =>
              node.nodeType === Node.ELEMENT_NODE &&
              node.nodeName === 'SCRIPT' &&
              (node as HTMLElement).getAttribute('type') ===
                'midscene_web_dump',
          );

          if (hasDumpScripts) {
            loadDumps();
            break;
          }
        }
      }
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });

    // Safety fallback in case other methods fail
    const fallbackTimer = setTimeout(loadDumps, 3000);

    return () => {
      document.removeEventListener('DOMContentLoaded', loadDumps);
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, [loadDumpElements]);

  if (error) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: '100px',
          boxSizing: 'border-box',
        }}
      >
        <Alert
          message="Midscene.js - Error"
          description={error}
          type="error"
          showIcon
        />
      </div>
    );
  }
  return <Visualizer dumps={reportDump} />;
}
