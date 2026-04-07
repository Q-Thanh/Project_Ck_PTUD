import React from 'react';
import { Search, MapPin, Sparkles, Star, Clock } from 'lucide-react';

// Thành phần Card cho phần Trending
const TrendingCard = ({ name, type, address, time }) => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
    <div className="relative h-48 bg-gray-200">
      <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500" className="w-full h-full object-cover" alt={name} />
      <div className="absolute top-3 right-3 flex gap-2">
        <span className="bg-yellow-400 text-[10px] font-bold px-2 py-1 rounded">Trending</span>
        <span className="bg-gray-100 text-[10px] font-bold px-2 py-1 rounded text-gray-500">$$</span>
      </div>
    </div>
    <div className="p-4">
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-gray-800">{name}</h3>
        <div className="flex items-center text-sm font-medium">
          <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" /> 0.0
        </div>
      </div>
      <p className="text-gray-500 text-xs mt-1">{type} • {address}</p>
      <div className="flex items-center mt-3 text-gray-400 text-[11px] border-t border-gray-50 pt-3">
        <Clock className="w-3 h-3 mr-1" /> {time}
      </div>
    </div>
  </div>
);

function App() {
  return (
    <div className="min-h-screen">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-10 py-4 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-brand w-8 h-8 flex items-center justify-center rounded-lg text-white font-bold text-xl">F</div>
          <span className="font-bold text-xl text-gray-800">FoodFinder</span>
        </div>
        <div className="flex gap-8 text-gray-500 font-medium">
          <span className="text-brand bg-orange-50 px-4 py-1 rounded-full cursor-pointer">Home</span>
          <span className="hover:text-brand cursor-pointer">Explore</span>
          <span className="hover:text-brand cursor-pointer">Community</span>
        </div>
        <button className="bg-brand text-white px-6 py-2 rounded-full font-bold hover:opacity-90 transition-all">
          Log In
        </button>
      </nav>

      {/* HERO SECTION */}
      <header className="max-w-4xl mx-auto text-center pt-20 pb-12 px-4">
        <h1 className="text-6xl font-extrabold text-gray-800 mb-6">
          Discover <span className="text-brand">Delicious</span> Food Around You
        </h1>
        <p className="text-gray-500 text-lg mb-10">Find the best local spots, hidden gems, and viral sensations.</p>
        
        <div className="relative max-w-2xl mx-auto mb-10">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            className="w-full pl-14 pr-6 py-5 rounded-full border border-gray-100 shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-100" 
            placeholder="Search for pho, coffee, burgers..."
          />
        </div>

        <div className="flex justify-center gap-4">
          <button className="bg-brand text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-orange-200 hover:scale-105 transition-all">
            <Sparkles className="w-5 h-5 fill-current" /> Decide For Me
          </button>
          <button className="bg-white border-2 border-gray-100 text-gray-600 px-10 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-50">
            <MapPin className="w-5 h-5" /> Near Me
          </button>
        </div>
      </header>

      {/* TRENDING SECTION */}
      <main className="max-w-7xl mx-auto px-10 py-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-brand">🍴</span> Trending Now
          </h2>
          <span className="text-brand font-bold cursor-pointer hover:underline text-sm">View All</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <TrendingCard name="Bánh Mì Huỳnh Hoa" type="Bánh Mì" address="26 Lê Thị Riêng" time="14:00 - 23:00" />
          <TrendingCard name="Hủ Tiếu Thành Đạt" type="Hủ Tiếu" address="34 Cô Bắc" time="00:00 - 23:59" />
          <TrendingCard name="Ốc Đào" type="Hải Sản" address="212B Nguyễn Trãi" time="10:00 - 22:00" />
          <TrendingCard name="Secret Garden" type="Món Việt" address="158 Pasteur" time="11:00 - 22:00" />
        </div>
      </main>
    </div>
  );
}

export default App;
  