import type { CommunityPost } from '../../../data/community'
import { getMagazineLayout } from '../../../lib/community/selectors'
import wallpaper from '../../../assets/home/wallpaper.jpg'

/** 衬线栈逐字取自 community-redesign.html */
const SERIF_STACK = '"Noto Serif SC","Songti SC",serif'

/** 分类 chips 固定 5 项（Ruling A），不从数据派生 */
const CATEGORIES: readonly string[] = ['全部', '自驾', '古镇', '徒步', '海岛']

interface MagazineViewProps {
  posts: readonly CommunityPost[]
  activeCategory: string
  onCategoryChange: (c: string) => void
  onOpenPost: (id: string) => void
}

/** 品牌叶子图标（对齐 mockup b-brand） */
function BrandMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f5f7f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 20c4-1 6-5 7-9 1 4 3 8 7 9-5 1-9 1-14 0z" />
      <path d="M10 11c-1-3 0-6 2-8" />
    </svg>
  )
}

/** 毛玻璃搜索圆内放大镜图标 */
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}

/**
 * 社区杂志沉浸视图（Plan 6 · Task 3）：
 * 风景 banner + 衬线标题 + 毛玻璃分类；编辑精选大图卡、热门两列小卡、其余全宽卡。
 * 视觉值逐字对齐 community-redesign.html；卡片为按钮，点击 onOpenPost(id)；
 * 分类变化经 onCategoryChange 上抛，过滤由容器负责。
 */
export default function MagazineView({ posts, activeCategory, onCategoryChange, onOpenPost }: MagazineViewProps) {
  const { featured, hotPair, rest } = getMagazineLayout(posts)

  return (
    <div style={{ background: '#1c2621', minHeight: '100%' }}>
      {/* 顶部 banner */}
      <div
        data-testid="mag-banner"
        style={{ position: 'relative', height: 268, overflow: 'hidden' }}
      >
        <img
          src={wallpaper}
          alt=""
          draggable={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg,rgba(16,24,20,.4) 0%,rgba(16,24,20,0) 30%,rgba(16,24,20,.78) 100%)',
          }}
        />
        {/* 顶部行：品牌 + 搜索圆 */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            right: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              color: '#f5f7f3',
              fontSize: 14,
              letterSpacing: 4,
              fontWeight: 600,
            }}
          >
            <BrandMark />
            发现
          </div>
          <div
            data-testid="mag-search-circle"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,.16)',
              border: '1px solid rgba(255,255,255,.4)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <SearchIcon />
          </div>
        </div>
        {/* 标题区 */}
        <div style={{ position: 'absolute', left: 20, bottom: 64 }}>
          <h1
            data-testid="mag-title"
            style={{
              fontSize: 29,
              fontFamily: SERIF_STACK,
              color: '#fbfcf8',
              lineHeight: 1.25,
              letterSpacing: 1,
              textShadow: '0 2px 10px rgba(0,0,0,.35)',
              margin: 0,
            }}
          >
            发现山野
          </h1>
          <p style={{ fontSize: 12, color: '#dfe6dc', margin: '6px 0 0' }}>
            328 条山野路线 · 本周新增 24
          </p>
        </div>
        {/* 分类 chips */}
        <div
          style={{
            position: 'absolute',
            left: 20,
            right: 20,
            bottom: 16,
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
          }}
        >
          {CATEGORIES.map((category) => {
            const active = activeCategory === category
            return (
              <button
                key={category}
                type="button"
                data-testid={`chip-${category}`}
                onClick={() => onCategoryChange(category)}
                style={{
                  flex: 'none',
                  fontSize: 11.5,
                  padding: '6px 15px',
                  borderRadius: 999,
                  cursor: 'pointer',
                  color: active ? '#2f3d33' : '#eef1ea',
                  background: active ? '#fff' : 'rgba(255,255,255,.14)',
                  border: `1px solid ${active ? '#fff' : 'rgba(255,255,255,.32)'}`,
                  backdropFilter: 'blur(10px)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {category}
              </button>
            )
          })}
        </div>
      </div>

      {/* 内容区 */}
      <div style={{ padding: '18px 18px 0' }}>
        {featured && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, margin: '2px 0 12px' }}>
              <span style={{ fontSize: 16, fontFamily: SERIF_STACK, color: '#f0f3ec', letterSpacing: 1 }}>编辑精选</span>
              <span style={{ fontSize: 10.5, color: '#8a9689' }}>本周最值得走的一条</span>
            </div>
            <button
              type="button"
              data-testid="mag-big-card"
              onClick={() => onOpenPost(featured.id)}
              style={{
                position: 'relative',
                borderRadius: 18,
                overflow: 'hidden',
                height: 178,
                marginBottom: 16,
                boxShadow: '0 12px 26px rgba(0,0,0,.35)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'block',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <img
                src={featured.cover}
                alt=""
                draggable={false}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(0deg,rgba(10,16,13,.78) 0%,rgba(10,16,13,.25) 45%,transparent 70%)',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  fontSize: 10,
                  color: '#2f3d33',
                  background: 'rgba(255,255,255,.9)',
                  padding: '4px 11px',
                  borderRadius: 999,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                精选
              </span>
              <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontFamily: SERIF_STACK,
                    color: '#fff',
                    textShadow: '0 1px 8px rgba(0,0,0,.4)',
                  }}
                >
                  {featured.title}
                </div>
                <div style={{ fontSize: 11, color: '#dfe6dc', marginTop: 4, display: 'flex', gap: 8 }}>
                  <span>{featured.days}天 · {featured.distanceKm}km ·</span>
                  <span style={{ color: '#9cc79e', fontWeight: 700 }}>{featured.difficulty}</span>
                </div>
              </div>
            </button>
          </>
        )}

        {hotPair.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, margin: '2px 0 12px' }}>
              <span style={{ fontSize: 16, fontFamily: SERIF_STACK, color: '#f0f3ec', letterSpacing: 1 }}>热门路线</span>
              <span style={{ fontSize: 10.5, color: '#8a9689' }}>大家都在走</span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {hotPair.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  data-testid="mag-mini-card"
                  onClick={() => onOpenPost(post.id)}
                  style={{
                    position: 'relative',
                    flex: 1,
                    borderRadius: 16,
                    overflow: 'hidden',
                    height: 150,
                    boxShadow: '0 10px 22px rgba(0,0,0,.3)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <img
                    src={post.cover}
                    alt=""
                    draggable={false}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(0deg,rgba(10,16,13,.78) 0%,rgba(10,16,13,.15) 50%,transparent 72%)',
                    }}
                  />
                  <div style={{ position: 'absolute', left: 11, right: 11, bottom: 10 }}>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontFamily: SERIF_STACK,
                        color: '#fff',
                        textShadow: '0 1px 6px rgba(0,0,0,.4)',
                      }}
                    >
                      {post.title}
                    </div>
                    <div style={{ fontSize: 10, color: '#d3dbd2', marginTop: 3 }}>
                      {post.days}天 · {post.difficulty}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {rest.map((post) => (
          <button
            key={post.id}
            type="button"
            onClick={() => onOpenPost(post.id)}
            style={{
              position: 'relative',
              borderRadius: 18,
              overflow: 'hidden',
              height: 150,
              marginBottom: 16,
              boxShadow: '0 12px 26px rgba(0,0,0,.35)',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'block',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <img
              src={post.cover}
              alt=""
              draggable={false}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(0deg,rgba(10,16,13,.78) 0%,rgba(10,16,13,.25) 45%,transparent 70%)',
              }}
            />
            <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12 }}>
              <div
                style={{
                  fontSize: 18,
                  fontFamily: SERIF_STACK,
                  color: '#fff',
                  textShadow: '0 1px 8px rgba(0,0,0,.4)',
                }}
              >
                {post.title}
              </div>
              <div style={{ fontSize: 11, color: '#dfe6dc', marginTop: 4, display: 'flex', gap: 8 }}>
                <span>{post.days}天 · {post.category} ·</span>
                <span style={{ color: '#9cc79e', fontWeight: 700 }}>{post.difficulty}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
