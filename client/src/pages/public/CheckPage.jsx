import React, { useState } from 'react';

// Custom Paw Print Icon used for bullet points and backgrounds
const PawIcon = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="7.5" cy="9.5" r="2" />
    <circle cx="10.5" cy="6.5" r="2" />
    <circle cx="14.5" cy="6.5" r="2" />
    <circle cx="17.5" cy="9.5" r="2" />
    <path d="M12 11.5c-2.2 0-3.5 1.5-3.5 3.5 0 2 1.5 3 3.5 3s3.5-1 3.5-3c0-2-1.3-3.5-3.5-3.5z" />
  </svg>
);

// Custom Hand-Drawn Heart SVG
const HandDrawnHeart = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M 50,35 C 35,10 10,25 10,50 C 10,75 40,90 50,95 C 60,90 90,75 90,50 C 90,25 65,10 50,35 Z" />
  </svg>
);

export default function PawsitiveLandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* Inject custom fonts directly */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&display=swap');
        
        .font-serif-paws {
          font-family: 'Playfair Display', serif;
        }
        .font-sans-paws {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .font-script-paws {
          font-family: 'Caveat', cursive;
        }
      `}</style>

      {/* HEADER SECTION */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-50 font-sans-paws">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          
          {/* Custom Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 text-[#00828a]">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
                {/* Floating Butterflies */}
                <path d="M68,12 C70,10 74,13 72,15 C70,17 66,13 68,12 Z" fill="#00828a" />
                <path d="M78,13 C80,11 84,14 82,17 C80,19 76,15 78,13 Z" fill="#00a8b3" />
                <path d="M85,25 C87,23 90,26 88,28 C86,30 83,27 85,25 Z" fill="#00828a" />
                {/* Paw Toes */}
                <circle cx="22" cy="45" r="9" />
                <circle cx="43" cy="28" r="10" />
                <circle cx="68" cy="33" r="10" />
                <circle cx="83" cy="55" r="9" />
                {/* Pad */}
                <path d="M52,48 C32,48 22,62 22,75 C22,88 35,95 52,95 C69,95 82,88 82,75 C82,62 72,48 52,48 Z" />
                {/* Cat Cutout Inside the main Pad */}
                <path d="M52,90 C45,90 41,84 41,75 C41,68 45,62 48,60 L48,53 C48,52 49,51 50,51 C51,51 52,52 52,53 L52,57 C53,57 54,57 55,57 L55,53 C55,52 56,51 57,51 C58,51 59,52 59,53 L59,60 C62,62 66,68 66,75 C66,84 61,90 52,90 Z" fill="#ffffff" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-3xl font-serif-paws text-[#1c3d3e] tracking-tight leading-none font-semibold">pawsitive</h1>
              <div className="text-[9px] tracking-[0.22em] text-[#00a8b3] font-bold uppercase mt-1">
                — transformations —
              </div>
              <p className="text-[9px] text-gray-500 font-medium mt-0.5">Cat Rescue & Human Wellness</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-7 text-[14px] font-semibold text-[#1c3d3e]">
            {['Home', 'About', 'Adopt', 'Foster', 'Get Involved', 'Education', 'Donate', 'Contact'].map((link) => (
              <a key={link} href={`#${link.toLowerCase().replace(' ', '-')}`} className="hover:text-[#00828a] transition-colors">
                {link}
              </a>
            ))}
          </nav>

          {/* Call to Action Button */}
          <div className="hidden xl:block">
            <button className="bg-[#00828a] text-white px-7 py-2.5 rounded-full text-[14px] font-bold hover:bg-[#006e75] transition-all shadow-sm hover:shadow-md">
              Donate
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 text-slate-700 hover:text-teal-600 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-white border-b border-gray-100 px-6 py-4 space-y-3">
            {['Home', 'About', 'Adopt', 'Foster', 'Get Involved', 'Education', 'Donate', 'Contact'].map((link) => (
              <a 
                key={link} 
                href={`#${link.toLowerCase().replace(' ', '-')}`}
                className="block text-slate-700 hover:text-[#00828a] font-semibold py-1.5"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link}
              </a>
            ))}
            <button className="w-full bg-[#00828a] text-white py-2.5 rounded-full font-bold">
              Donate
            </button>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-white font-sans-paws pb-12 lg:pb-0">
        
        {/* Soft Organic Background Shape (matching the ref) */}
        <div 
          className="absolute right-0 top-0 h-[85%] lg:h-full w-full lg:w-[50%] bg-[#ebf4f6] -z-10"
          style={{ 
            borderRadius: '0 0 0 60% / 0 0 0 35%',
          }}
        />

        {/* Floating Teal Paw Prints (Matching ref positions) */}
        <div className="absolute right-[46%] top-[30%] text-[#00a8b3]/20 -z-10 transform -rotate-12">
          <PawIcon className="w-12 h-12" />
        </div>
        <div className="absolute right-[4%] top-[14%] text-[#00a8b3]/20 -z-10 transform rotate-12 flex flex-col gap-4">
          <PawIcon className="w-10 h-10" />
          <PawIcon className="w-8 h-8 transform translate-x-4" />
          <PawIcon className="w-6 h-6 transform translate-x-8" />
        </div>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[580px]">
          {/* Left Text Column */}
          <div className="lg:col-span-6 py-8 space-y-8 text-center lg:text-left">
            <div className="space-y-4">
              {/* Logo Repeat inside Hero Content */}
              <div className="flex flex-col items-center lg:items-start">
                <h2 className="text-5xl lg:text-[76px] font-serif-paws text-[#1c3d3e] tracking-tight leading-none font-medium">pawsitive</h2>
                <div className="text-[13px] tracking-[0.32em] text-[#00a8b3] font-bold uppercase mt-2 lg:mt-3">
                  — transformations —
                </div>
                <p className="text-[14px] text-slate-500 font-semibold mt-1">Cat Rescue & Human Wellness</p>
              </div>

              <p className="text-[#3c4a4b] text-[15px] lg:text-[17px] leading-relaxed max-w-xl font-medium pt-4">
                Pawsitive Transformations is dedicated to improving the lives of cats and people through rescue, advocacy, education, wellness initiatives, and community support.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button className="bg-[#00828a] text-white px-8 py-3.5 rounded-xl font-bold text-[15px] hover:bg-[#006e75] transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                Adopt a Cat
              </button>
              <button className="bg-[#00828a] text-white px-8 py-3.5 rounded-xl font-bold text-[15px] hover:bg-[#006e75] transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Make a Donation
              </button>
            </div>
          </div>

          {/* Right Image Column (Kitten Looking Up) */}
          <div className="lg:col-span-6 relative h-full flex items-end justify-center lg:justify-end">
            <div className="relative w-[340px] sm:w-[440px] lg:w-[480px] xl:w-[520px] max-w-full">
              {/* Main Cat Image Cutout */}
              <img 
                src="https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&q=80&w=600&h=600"
                alt="Tabby kitten looking upwards"
                className="w-full object-contain pointer-events-none mix-blend-multiply"
              />
            </div>
          </div>
        </div>
      </section>

      {/* PILLARS SECTION */}
      <section className="bg-white border-y border-gray-100 py-16 font-sans-paws">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          
          {/* Rescue */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full border border-teal-500/30 flex items-center justify-center text-[#00828a] bg-teal-50/20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4.418 0-8-3.582-8-8 0-1.8.6-3.4 1.6-4.8L4 4l4.2 1.6C9.6 4.6 11.2 4 12 4s2.4.6 3.8 1.6L20 4l-1.6 4.2c1 1.4 1.6 3 1.6 4.8 0 4.418-3.582 8-8 8z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h.01M15 12h.01M12 15c-1 0-1.5-.5-1.5-.5h3s-.5.5-1.5.5z" />
              </svg>
            </div>
            <h3 className="text-[14px] font-bold uppercase tracking-widest text-[#00828a]">Rescue</h3>
            <p className="text-gray-500 text-[13px] font-medium max-w-[160px]">Saving cats and kittens in need.</p>
          </div>

          {/* Wellness */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full border border-teal-500/30 flex items-center justify-center text-[#00828a] bg-teal-50/20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-[14px] font-bold uppercase tracking-widest text-[#00828a]">Wellness</h3>
            <p className="text-gray-500 text-[13px] font-medium max-w-[180px]">Supporting the wellness of cats and people.</p>
          </div>

          {/* Educate */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full border border-teal-500/30 flex items-center justify-center text-[#00828a] bg-teal-50/20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-[14px] font-bold uppercase tracking-widest text-[#00828a]">Educate</h3>
            <p className="text-gray-500 text-[13px] font-medium max-w-[160px]">Providing resources for a better future.</p>
          </div>

          {/* Community */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full border border-teal-500/30 flex items-center justify-center text-[#00828a] bg-teal-50/20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-[14px] font-bold uppercase tracking-widest text-[#00828a]">Community</h3>
            <p className="text-gray-500 text-[13px] font-medium max-w-[180px]">Building a stronger, compassionate community.</p>
          </div>

        </div>
      </section>

      {/* THREE-COLUMN DETAILS SECTION */}
      <section className="bg-white py-16 font-sans-paws">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8 xl:gap-12 lg:divide-x lg:divide-teal-600/15">
            
            {/* COLUMN 1: FEATURED CATS */}
            <div className="space-y-8 flex flex-col justify-between items-center text-center lg:px-4">
              <div className="space-y-6 w-full">
                <div className="flex items-center justify-center gap-2 text-[#00828a]">
                  <PawIcon className="w-6 h-6" />
                  <h4 className="text-lg font-bold uppercase tracking-wider">Featured Cats</h4>
                </div>
                {/* 4 Portrait Cat Cards */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=200&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1574158622643-69d34d72650a?w=200&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=200&h=300&fit=crop"
                  ].map((url, i) => (
                    <div key={i} className="aspect-[3/4] rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                      <img src={url} alt={`Rescue cat ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
              <button className="bg-[#00828a] text-white px-8 py-3 rounded-xl font-bold text-[14px] hover:bg-[#006e75] transition-all w-full sm:w-auto shadow-sm">
                View All Cats
              </button>
            </div>

            {/* COLUMN 2: CURRENT RESCUE NEEDS */}
            <div className="space-y-8 flex flex-col justify-between items-center text-center lg:px-8">
              <div className="space-y-6 w-full">
                <h4 className="text-lg font-bold uppercase tracking-wider text-[#00828a]">Current Rescue Needs</h4>
                {/* Clean list with paw print icons */}
                <ul className="text-left space-y-4 max-w-sm mx-auto font-semibold text-slate-700">
                  {[
                    'Kitten Formula & Bottles',
                    'Canned Cat Food (Kittens & Adults)',
                    'Litter (Unscented)',
                    'Fleece Blankets & Towels'
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <span className="text-[#00828a] shrink-0">
                        <PawIcon className="w-5 h-5" />
                      </span>
                      <span className="text-[14px]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button className="bg-[#00828a] text-white px-8 py-3 rounded-xl font-bold text-[14px] hover:bg-[#006e75] transition-all w-full sm:w-auto shadow-sm">
                See All Needs
              </button>
            </div>

            {/* COLUMN 3: OUR IMPACT */}
            <div className="space-y-8 flex flex-col justify-between items-center text-center lg:px-4">
              <div className="space-y-6 w-full">
                <div className="flex items-center justify-center gap-2 text-[#00828a]">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  <h4 className="text-lg font-bold uppercase tracking-wider">Our Impact</h4>
                </div>
                {/* Large visual stats */}
                <div className="space-y-4">
                  <div>
                    <span className="block text-4xl lg:text-5xl font-extrabold text-[#00828a] tracking-tight">2,450+</span>
                    <span className="text-[12px] uppercase tracking-widest text-gray-500 font-bold">Cats Rescued</span>
                  </div>
                  <div>
                    <span className="block text-4xl lg:text-5xl font-extrabold text-[#00828a] tracking-tight">15,000+</span>
                    <span className="text-[12px] uppercase tracking-widest text-gray-500 font-bold">Lives Touched</span>
                  </div>
                </div>
              </div>
              <button className="bg-[#00828a] text-white px-8 py-3 rounded-xl font-bold text-[14px] hover:bg-[#006e75] transition-all w-full sm:w-auto shadow-sm">
                Our Story
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* LOWER BANNER & HERO SECTION */}
      <section className="relative overflow-hidden bg-[#ebf4f6] font-sans-paws pt-16 pb-8 lg:pb-0">
        
        {/* Soft Wave SVG Overlay on Top border (to break straight lines) */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-white" style={{ clipPath: 'ellipse(60% 100% at 50% 0%)' }} />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text with hand-drawn element */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left py-6">
            <div className="flex items-center justify-center lg:justify-start gap-4">
              {/* Double Paws */}
              <div className="flex text-[#00828a]">
                <PawIcon className="w-12 h-12 rotate-[-15deg]" />
                <PawIcon className="w-8 h-8 rotate-[15deg] translate-y-2 -translate-x-1" />
              </div>
            </div>
            
            <div className="relative inline-block space-y-1">
              <h3 className="text-3xl lg:text-[42px] font-medium text-[#1c3d3e] leading-tight tracking-tight">
                Every rescue
              </h3>
              <h3 className="text-3xl lg:text-[42px] font-medium text-[#1c3d3e] leading-tight tracking-tight">
                transforms two lives
              </h3>
              
              {/* Handwritten and Hand-drawn accents */}
              <div className="flex items-center justify-center lg:justify-start gap-3 pt-2">
                <span className="text-4xl lg:text-5xl font-script-paws text-[#00828a]">
                  a cat's and yours.
                </span>
                <span className="text-[#00828a]/80 transform rotate-[10deg] shrink-0">
                  <HandDrawnHeart className="w-8 h-8" />
                </span>
                <span className="text-[#00828a]/40 transform -rotate-[15deg] translate-y-2 shrink-0">
                  <HandDrawnHeart className="w-5 h-5" />
                </span>
              </div>
            </div>
          </div>

          {/* Right Sleeping Cat */}
          <div className="lg:col-span-6 flex items-end justify-center lg:justify-end">
            <div className="relative w-[340px] lg:w-[460px] max-w-full">
              <img 
                src="https://images.unsplash.com/photo-1571566882372-1598d83aba92?auto=format&fit=crop&q=80&w=600&h=450"
                alt="Happy sleeping cat"
                className="w-full object-contain pointer-events-none mix-blend-multiply"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER BAR */}
      <footer className="bg-[#00828a] text-white py-6 font-sans-paws text-[13px] font-semibold">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            EIN: 46-4005576
          </div>
          {/* Social Media Links */}
          <div className="flex items-center gap-5">
            {/* Facebook */}
            <a href="#" className="hover:text-teal-200 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
              </svg>
            </a>
            {/* Instagram */}
            <a href="#" className="hover:text-teal-200 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            {/* TikTok */}
            <a href="#" className="hover:text-teal-200 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.03 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.19 1.1 1.2 2.58 1.94 4.17 2.13v3.91c-1.25-.11-2.48-.54-3.56-1.19-.88-.53-1.61-1.27-2.16-2.14v7.94c0 1.2-.23 2.37-.67 3.47-.8 1.96-2.39 3.52-4.36 4.29-1.24.48-2.58.65-3.89.47-2-.28-3.84-1.39-5.06-3.04C1.29 17.51.85 15.02 1.25 12.6c.39-2.34 1.77-4.47 3.75-5.71 1.46-.92 3.17-1.35 4.88-1.24.01 1.43-.01 2.86-.01 4.29-.8-.23-1.67-.17-2.43.21-.92.46-1.6 1.34-1.84 2.34-.33 1.39.2 2.89 1.29 3.76.84.67 1.92.95 2.99.78 1.05-.16 1.98-.81 2.45-1.77.29-.6.41-1.27.4-1.93V.02z" />
              </svg>
            </a>
            {/* Contact Email / Mail */}
            <a href="mailto:info@pawsitivetransformations.org" className="hover:text-teal-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}