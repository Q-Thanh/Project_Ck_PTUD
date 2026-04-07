import React from 'react';
import { Search, MapPin, Sparkles, Star, Clock } from 'lucide-react';

const restaurants = [
  { id: 1, name: "Phở Hòa", category: "Phở", address: "260C Pasteur", time: "06:00 - 22:00", rating: "0.0", isTrending: false },
  { id: 2, name: "Bánh Mì Huỳnh Hoa", category: "Bánh Mì", address: "26 Lê Thị Riêng", time: "14:00 - 23:00", rating: "0.0", isTrending: true },
  { id: 3, name: "Cơm Tấm Ba Ghiền", category: "Cơm Tấm", address: "84 Đặng Văn Ngữ", time: "07:00 - 21:00", rating: "0.0", isTrending: false },
  { id: 4, name: "Hủ Tiếu Nam Vang Thành Đạt", category: "Hủ Tiếu", address: "34 Cô Bắc", time: "00:00 - 23:59", rating: "0.0", isTrending: true },
  { id: 5, name: "Ốc Đào", category: "Hải Sản/Ốc", address: "212B/D28 Nguyễn Trãi", time: "10:00 - 22:00", rating: "0.0", isTrending: true },
  { id: 6, name: "Secret Garden", category: "Món Việt", address: "158 Pasteur", time: "11:00 - 22:00", rating: "0.0", isTrending: true },
  { id: 7, name: "Pizza 4P's Ben Thanh", category: "Pizza", address: "8 Thu Khoa Huan", time: "11:00 - 22:30", rating: "0.0", isTrending: false },
  { id: 8, name: "Gong Cha Tea", category: "Bubble Tea", address: "123 Nguyen Hue", time: "09:00 - 22:00", rating: "0.0", isTrending: false },
  { id: 9, name: "Bún Bò Huế Út Hưng", category: "Bún Bò", address: "6C Tú Xương", time: "06:00 - 21:00", rating: "0.0", isTrending: false },
  { id: 10, name: "Bún Chả 145", category: "Bún Chả", address: "145 Bùi Viện", time: "11:30 - 20:00", rating: "0.0", isTrending: false },
  { id: 11, name: "The Workshop Coffee", category: "Cà phê", address: "27 Ngô Đức Kế", time: "08:00 - 21:00", rating: "0.0", isTrending: false }
];

const PlaceCard = ({ place, showTrendingBadge }) => (
  <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer group flex flex-col">
    <div className="h-44 bg-gray-100 card-img-placeholder relative">
      <img src={`https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80`} alt={place.name} className="w-full h-full object-cover" />
      {showTrendingBadge && (
        <div className="absolute top-3 right-3 flex gap-2">
          <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded">Trending</span>
          <span className="bg-white text-gray-800 text-[10px] font-bold px-2 py-1 rounded shadow-sm">$$</span>
        </div>
      )}
    </div>
    <div className="p-4 flex-1 flex flex-col">
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-bold text-[15px] text-gray-900 group-hover:text-brand transition line-clamp-1 mr-2">{place.name}</h3>
        <span className="flex items-center text-xs font-bold text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded">
          <Star className="w-3 h-3 text-yellow-400 mr-1" /> {place.rating}
        </span>
      </div>
      <p className="text-[13px] text-gray-500 mb-3 truncate">{place.category} • {place.address}</p>
      <div className="mt-auto flex items-center gap-1.5 text-[12px] text-gray-400">
        <Clock className="w-3.5 h-3.5" />
        <span>{place.time}</span>
      </div>
    </div>
  </div>
);

function App() {
  const trendingPlaces = restaurants.filter(r => r.isTrending).slice(0, 4);
  const allPlacesOrder = [1, 2, 3, 7, 8, 4, 9, 5, 10, 11, 6];

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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {trendingPlaces.map(p => (
            <PlaceCard key={p.id} place={p} showTrendingBadge />
          ))}
        </div>

        {/* ALL PLACES */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">All Places</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {allPlacesOrder.map(id => {
            const place = restaurants.find(r => r.id === id);
            return place ? <PlaceCard key={place.id} place={place} showTrendingBadge={false} /> : null;
          })}
        </div>
      </main>
    </div>
  );
}

export default App;
  