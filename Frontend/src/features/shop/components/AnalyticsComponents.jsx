import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, BarChart, Bar 
} from 'recharts';

const COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#9D84B7'];

/**
 * Revenue Trend Chart
 * Shows daily revenue for the last 7 days
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 shadow-2xl rounded-2xl border border-gray-100 min-w-[200px]">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] font-black uppercase text-sky-400">Offline Rev:</span>
            <span className="text-sm font-black text-gray-900">₹{payload.find(p => p.dataKey === 'offlineRevenue')?.value.toLocaleString() || 0}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] font-black uppercase text-sky-600">Online Rev:</span>
            <span className="text-sm font-black text-gray-900">₹{payload.find(p => p.dataKey === 'onlineRevenue')?.value.toLocaleString() || 0}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] font-black uppercase text-sky-700">Wholesale:</span>
            <span className="text-sm font-black text-gray-900">₹{payload.find(p => p.dataKey === 'b2bRevenue')?.value.toLocaleString() || 0}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-2 mt-2">
            <span className="text-[11px] font-black uppercase text-gray-500">Daily Total:</span>
            <span className="text-sm font-black text-gray-900">₹{payload[0].payload.revenue.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-2 mt-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Order Count</span>
            <span className="text-sm font-black text-gray-900">{payload[0].payload.orders}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const RevenueChart = ({ data }) => {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={240}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorOffline" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorOnline" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorB2B" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
             verticalAlign="top" 
             align="right" 
             iconType="circle"
             wrapperStyle={{ 
                fontSize: '9px', 
                fontWeight: '900', 
                textTransform: 'uppercase',
                paddingBottom: '20px',
                right: 0
             }}
          />
          <Area 
            type="monotone" 
            name="Offline"
            dataKey="offlineRevenue" 
            stroke="#38bdf8" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorOffline)" 
          />
          <Area 
            type="monotone" 
            name="Online"
            dataKey="onlineRevenue" 
            stroke="#0ea5e9" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorOnline)" 
          />
          <Area 
            type="monotone" 
            name="Wholesale (B2B)"
            dataKey="b2bRevenue" 
            stroke="#0284c7" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorB2B)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Top Products Pie Chart
 * Shows distribution of top selling product categories
 */
export const CategoryPieChart = ({ data, hideLegend = false }) => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%" minHeight={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={10} />
            ))}
          </Pie>
          <Tooltip 
             contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
                fontWeight: '800'
              }} 
          />
          {!hideLegend && (
            <Legend 
              verticalAlign="bottom" 
              align="center"
              iconType="circle"
              wrapperStyle={{ 
                  fontSize: '10px', 
                  fontWeight: '900', 
                  textTransform: 'uppercase',
                  paddingTop: '20px'
              }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Busy Hours Bar Chart
 * Shows order volume by time of day
 */
export const BusyHoursChart = ({ data }) => {
  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="hour" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
          />
          <YAxis hide />
          <Tooltip 
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
