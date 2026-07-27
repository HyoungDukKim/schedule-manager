import "../../styles/sidebar.css";

function Sidebar() {
  return (
    <aside className="sidebar">
      <h2>📅 일정관리</h2>

      <ul className="menu-list">
        <li>🏠 대시보드</li>
        <li>📅 일정</li>
        <li>📝 메모</li>
        <li>⭐ 즐겨찾기</li>
        <li>📊 통계</li>
        <li>⚙ 설정</li>
      </ul>
    </aside>
  );
}

export default Sidebar;