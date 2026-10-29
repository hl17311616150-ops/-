import chuanxiImg from '../assets/home/card-chuanxi.jpg'
import dianxibeiImg from '../assets/home/card-dianxibei.jpg'
import wannanImg from '../assets/home/card-wannan.jpg'
import qingganImg from '../assets/home/card-qinggan.jpg'
import hainanImg from '../assets/home/card-hainan.jpg'
import dongbeiImg from '../assets/home/card-dongbei.jpg'

export type Difficulty = '轻松' | '中等' | '挑战'

export interface HotRoute {
  id: string
  name: string
  days: number
  distanceKm: number
  difficulty: Difficulty
  desc?: string
  image: string
}

export const HOT_ROUTES: readonly HotRoute[] = [
  { id: 'chuanxi', name: '川西小环线 5 日', days: 5, distanceKm: 420, difficulty: '中等', desc: '雪山、藏寨、高山海子环线', image: chuanxiImg },
  { id: 'dianxibei', name: '滇西北 7 日', days: 7, distanceKm: 680, difficulty: '中等', image: dianxibeiImg },
  { id: 'wannan', name: '皖南古村 6 日', days: 6, distanceKm: 500, difficulty: '轻松', image: wannanImg },
  { id: 'qinggan', name: '青甘大环线 7 日', days: 7, distanceKm: 1200, difficulty: '挑战', desc: '翡翠湖、盐湖、戈壁与雪山', image: qingganImg },
  { id: 'hainan', name: '海南环岛 5 日', days: 5, distanceKm: 460, difficulty: '轻松', desc: '椰林、沙滩与环岛海岸', image: hainanImg },
  { id: 'dongbei', name: '东北雪乡 6 日', days: 6, distanceKm: 540, difficulty: '中等', desc: '雪村、冰灯与林海雪原', image: dongbeiImg },
]
