import { Fragment, type JSX } from 'react'

interface PostRouteCardProps {
  nodes: string[]
}

/**
 * 社区帖子路线卡（Plan 6 · Task 5）：
 * 半透明底 + 细边框圆角 15、padding 13；节点 chip 半透明圆角 8，节点间 "→"（#6a7a6c）。
 * 视觉值逐字对齐 community-detail-dark.html .route-card / .route-line。
 */
export default function PostRouteCard({ nodes }: PostRouteCardProps): JSX.Element {
  return (
    <div
      data-testid="post-route-card"
      style={{
        background: 'rgba(255,255,255,.05)',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 15,
        padding: 13,
        marginBottom: 14,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, fontSize: 11.5 }}>
        {nodes.map((node, index) => (
          <Fragment key={`${node}-${index}`}>
            <span
              style={{
                background: 'rgba(255,255,255,.1)',
                color: '#dfe6dc',
                padding: '4px 10px',
                borderRadius: 8,
              }}
            >
              {node}
            </span>
            {index < nodes.length - 1 && (
              <span style={{ color: '#6a7a6c', alignSelf: 'center' }}>→</span>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
