export default function LoginScreen({ onLogin }) {
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-emoji">🌿</div>
        <h1>Sağlık Takibi</h1>
        <p>Verilerin buluta kaydedilir; her cihazdan erişebilirsin.</p>
        <button className="login-btn" onClick={onLogin}>
          Google ile giriş yap
        </button>
      </div>
    </div>
  )
}
