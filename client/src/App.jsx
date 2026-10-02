import { Link, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import PostEditor from './pages/PostEditor';
import MyPosts from './pages/MyPosts';
import { Login, OAuthCallback, Register } from './pages/AuthPages';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import Posts from './pages/admin/Posts';
import Comments from './pages/admin/Comments';

function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="page-title">Page not found</h1>
      <Link to="/" className="btn btn-primary mt-4">
        Back to home
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/posts/:slug" element={<PostDetail />} />

          {/* Any signed-in user */}
          <Route element={<ProtectedRoute />}>
            <Route path="/posts/new" element={<PostEditor />} />
            <Route path="/posts/:slug/edit" element={<PostEditor />} />
            <Route path="/my-posts" element={<MyPosts />} />
          </Route>

          {/* Admins only */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="posts" element={<Posts />} />
              <Route path="comments" element={<Comments />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="meta mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-2 px-4 pt-6 pb-10 sm:px-8">
        <span>Inkwell</span>
        <span>MongoDB · Express · React · Node.js</span>
      </footer>
    </div>
  );
}
