//src/app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("cain_token");
    fetch("/api/admin/users/all", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setUsers(d.users));
  }, []);

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">전체 회원 목록</h1>

      <table className="w-full text-sm border border-white/10">
        <thead className="bg-white/5">
          <tr>
            <th>닉네임</th>
            <th>국적</th>
            <th>거래소</th>
            <th>가입일</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.uid} className="border-t border-white/5">
              <td>{u.username}</td>
              <td>{u.nationality}</td>
              <td>{u.exchange}</td>
              <td>{new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
