import { Link } from 'react-router-dom'

export default function NotFoundView() {
  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-6xl mb-6">🧶</div>
        <h1 className="text-4xl font-bold text-text-primary mb-4">404</h1>
        <h2 className="text-xl font-semibold text-text-secondary mb-6">
          找不到頁面
        </h2>
        <p className="text-text-tertiary mb-8">
          您要查找的頁面不存在或已被移動
        </p>
        <Link
          to="/"
          className="btn btn-primary"
        >
          回到首頁
        </Link>
      </div>
    </div>
  )
}