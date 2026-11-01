import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import HomeCover from './pages/cover/HomeCover'
import PlanFlow from './pages/plan/PlanFlow'
import TripDetail from './pages/trip/TripDetail'
import CommunityList from './pages/community/CommunityList'
import PostDetail from './pages/community/PostDetail'
import Profile from './pages/profile/Profile'
import PublishPage from './pages/community/publish/PublishPage'
import CommentsPage from './pages/community/comments/CommentsPage'

/**
 * 路由表（不含 BrowserRouter，便于测试用 MemoryRouter 挂载）。
 * 未匹配路径重定向到封面首页。
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeCover />} />
      <Route path="/plan" element={<PlanFlow />} />
      <Route path="/trip/:id" element={<TripDetail />} />
      <Route path="/community" element={<CommunityList />} />
      <Route path="/community/:id" element={<PostDetail />} />
      <Route path="/community/:id/comments" element={<CommentsPage />} />
      <Route path="/publish" element={<PublishPage />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
