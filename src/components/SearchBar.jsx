import { useEffect, useState } from "react";

export default function SearchBar({ onSearch, filters = {} }) {
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      onSearch({ query: q, area, category });
    }, 500);
    return () => clearTimeout(t);
  }, [q, area, category, onSearch]);

  return (
    <div className="surface-card p-3 flex items-center w-full">
      <input
        className="flex-1 p-3 border rounded-md shadow-sm"
        placeholder="Tim ten quan..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="ml-auto flex items-center space-x-2">
        <select className="h-10 px-3 border rounded-md bg-white text-sm" value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Tat ca khu vuc</option>
          <option>Quan 1</option>
          <option>Quan 3</option>
          <option>Binh Thanh</option>
        </select>

        <select className="h-10 px-3 border rounded-md bg-white text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Tat ca loai</option>
          <option>Pho</option>
          <option>Banh mi</option>
          <option>Com tam</option>
          <option>Coffee</option>
        </select>
      </div>
    </div>
  );
}
