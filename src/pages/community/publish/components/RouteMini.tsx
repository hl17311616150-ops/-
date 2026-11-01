import { Fragment, type JSX } from 'react'

interface RouteMiniProps {
  nodes: string[]
}

/**
 * 路线摘要条（Plan 7 · Task 4）：
 * 白 .05 底 / 白 .09 边、圆角 11、padding 10px 12px、11px #bcc7be，节点以「→」连接。
 * 视觉值逐字对齐 brief / .route-mini。
 */
export default function RouteMini({ nodes }: RouteMiniProps): JSX.Element {
  return (
    <div
      data-testid="route-mini"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 5,
        background: 'rgba(255,255,255,.05)',
        border: '1px solid rgba(255,255,255,.09)',
        borderRadius: 11,
        padding: '10px 12px',
        fontSize: 11,
        color: '#bcc7be',
      }}
    >
      {nodes.map((node, index) => (
        <Fragment key={`${node}-${index}`}>
          <span>{node}</span>
          {index < nodes.length - 1 && <span style={{ color: '#6a7a6c' }}>→</span>}
        </Fragment>
      ))}
    </div>
  )
}
