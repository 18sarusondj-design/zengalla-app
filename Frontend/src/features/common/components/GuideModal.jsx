import React, { useState } from 'react';
import { X, CirclePlay, Camera, Headphones, ShoppingBag, Store, CreditCard, Truck, ExternalLink, HelpCircle, Languages, LayoutGrid } from 'lucide-react';

const GuideModal = ({ isOpen, onClose }) => {
  const [lang, setLang] = useState('en');

  if (!isOpen) return null;

  const content = {
    en: {
      title: "Digital Shop Guide",
      subtitle: "Learn how to use our platform in 5 simple steps.",
      steps: [
        { icon: <Store className="text-blue-500" />, title: "1. Browse Shops", desc: "View all nearby grocery stores listed on our platform." },
        { icon: <ShoppingBag className="text-sky-500" />, title: "2. Choose Products", desc: "Select items from your favorite store and add them to your cart." },
        { icon: <LayoutGrid className="text-sky-500" />, title: "3. Easy Checkout", desc: "Enter your delivery address and contact details accurately." },
        { icon: <CreditCard className="text-sky-500" />, title: "4. Secure Payment", desc: "For faster delivery, pay using the provided scanner. Home delivery is available if the store offers it; otherwise, pick up from the shop." },
        { icon: <Truck className="text-sky-500" />, title: "5. Live Tracking", desc: "Sit back and track your order progress in real-time until delivery." }
      ],
      socialTitle: "Connect With Us",
      instaBtn: "Instagram Help"
    },
    hi: {
      title: "डिजिटल शॉप गाइड",
      subtitle: "5 आसान चरणों में हमारे प्लेटफॉर्म का उपयोग करना सीखें।",
      steps: [
        { icon: <Store className="text-blue-500" />, title: "1. दुकानें देखें", desc: "हमारे प्लेटफॉर्म पर सूचीबद्ध सभी नजदीಕಿ किराना दुकानें देखें।" },
        { icon: <ShoppingBag className="text-sky-500" />, title: "2. उत्पाद चुनें", desc: "अपनी पसंदीदा दुकान से सामान चुनें और उन्हें अपनी कार्ट में जोड़ें।" },
        { icon: <LayoutGrid className="text-sky-500" />, title: "3. आसान चेकआउट", desc: "अपना पता और संपर्क विवरण सही-सही दर्ज करें।" },
        { icon: <CreditCard className="text-sky-500" />, title: "4. सुरक्षित भुगतान", desc: "तेज़ी डिलीवरी के लिए, दिए गए स्कैनर का उपयोग करके भुगतान करें। होम डिलीवरी तभी मिलेगी जब स्टोर में सुविधा हो, अन्यथा आपको दुकान से लेना होगा।" },
        { icon: <Truck className="text-sky-500" />, title: "5. लाइव ट्रैकिंग", desc: "आराम से बैठें और डिलीवरी होने तक रियल-टाइम में अपने ऑर्डर को ट्रैक करें।" }
      ],
      socialTitle: "हमसे जुड़ें",
      instaBtn: "इंस्टाग्राम मदद"
    },
    kn: {
      title: "ಡಿಜಿಟಲ್ ಶಾಪ್ ಗೈಡ್",
      subtitle: "5 ಸರಳ ಹಂತಗಳಲ್ಲಿ ನಮ್ಮ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ಅನ್ನು ಹೇಗೆ ಬಳಸುವುದು ಎಂದು ತಿಳಿಯಿರಿ.",
      steps: [
        { icon: <Store className="text-blue-500" />, title: "1. ಅಂಗಡಿಗಳನ್ನು ಬ್ರೌಸ್ ಮಾಡಿ", desc: "ನಮ್ಮ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್‌ನಲ್ಲಿ ಪಟ್ಟಿ ಮಾಡಲಾದ ಹತ್ತಿರದ ಎಲ್ಲಾ ದಿನಸಿ ಅಂಗಡಿಗಳನ್ನು ನೋಡಿ." },
        { icon: <ShoppingBag className="text-sky-500" />, title: "2. ಉತ್ಪನ್ನಗಳನ್ನು ಆರಿಸಿ", desc: "ನಿಮ್ಮ ನೆಚ್ಚಿನ ಅಂಗಡಿಯಿಂದ ವಸ್ತುಗಳನ್ನು ಆರಿಸಿ ಮತ್ತು ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ." },
        { icon: <LayoutGrid className="text-sky-500" />, title: "3. ಸುಲಭ ಚೆಕ್‌ಔಟ್", desc: "ನಿಮ್ಮ ವಿಳಾಸ ಮತ್ತು ಸಂಪರ್ಕ ವಿವರಗಳನ್ನು ನಿಖರವಾಗಿ ನಮೂದಿಸಿ." },
        { icon: <CreditCard className="text-sky-500" />, title: "4. ಸುರಕ್ಷಿತ ಪಾವತಿ", desc: "ವೇಗದ ವಿತರಣೆಗಾಗಿ, ಒದಗಿಸಿದ ಸ್ಕ್ಯಾನರ್ ಬಳಸಿ ಪಾವತಿಸಿ. ಅಂಗಡಿಯಲ್ಲಿ ಡೆಲಿವರಿ ಆಯ್ಕೆ ಇದ್ದರೆ ಮಾತ್ರ ಹೋಮ್ ಡೆಲಿವರಿ ಸಿಗುತ್ತದೆ, ಇಲ್ಲದಿದ್ದರೆ ಅಂಗಡಿಯಿಂದಲೇ ಪಡೆಯಬೇಕು." },
        { icon: <Truck className="text-sky-500" />, title: "5. ಲೈವ್ ಟ್ರ್ಯಾಕಿಂಗ್", desc: "ನಿಮ್ಮ ಆರ್ಡರ್ ಪ್ರಗತಿಯನ್ನು ನೈಜ ಸಮಯದಲ್ಲಿ ಲೈವ್ ಆಗಿ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ." }
      ],
      socialTitle: "ನಮ್ಮೊಂದಿಗೆ ಸಂಪರ್ಕದಲ್ಲಿರಿ",
      instaBtn: "ಇನ್‌ಸ್ಟಾಗ್ರಾಮ್ ಸಹಾಯ"
    }
  };

  const current = content[lang];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-in">
        
        {/* Header Overlay */}
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={onClose}
            className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Top Banner Area */}
        <div className="bg-gradient-to-br from-sky-600 to-sky-800 p-8 pt-10 text-white relative">
          <div className="absolute -right-10 -bottom-10 opacity-10">
            <HelpCircle size={200} strokeWidth={1} />
          </div>
          <div className="flex items-center gap-3 mb-4">
             <Languages size={24} className="text-sky-300" />
             <div className="flex bg-white/20 rounded-xl p-1 gap-1">
                {['en', 'hi', 'kn'].map(l => (
                  <button 
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${lang === l ? 'bg-white text-sky-800' : 'text-white hover:bg-white/10'}`}
                  >
                    {l === 'en' ? 'EN' : l === 'hi' ? 'HI' : 'KN'}
                  </button>
                ))}
             </div>
          </div>
          <h2 className="text-3xl font-black tracking-tight leading-tight mb-2">{current.title}</h2>
          <p className="text-sky-100/80 text-sm font-medium">{current.subtitle}</p>
        </div>

        {/* Content Area - Scrollable */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            {current.steps.map((step, idx) => (
              <div key={idx} className="flex gap-4 group">
                <div className="w-12 h-12 shrink-0 bg-gray-50 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ease-out">
                  {step.icon}
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-gray-900 text-sm">{step.title}</h4>
                  <p className="text-gray-500 text-xs leading-relaxed font-medium">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <hr className="my-8 border-gray-100" />


            {/* Support Link */}
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400 mt-4 py-2 bg-gray-50 rounded-xl">
               <Headphones size={14} />
               <span>Need more help? Contact Support</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-gray-50 sm:block hidden">
          <button 
            onClick={onClose}
            className="w-full bg-sky-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-sky-200 hover:bg-sky-700 transition-all hover:translate-y-[-2px] active:translate-y-0 uppercase tracking-[0.2em] text-xs"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideModal;
