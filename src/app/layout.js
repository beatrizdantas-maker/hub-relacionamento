export const metadata = {
  title: 'Hub de Relacionamento',
  description: 'Sistema de gestão de relacionamento escolar',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
