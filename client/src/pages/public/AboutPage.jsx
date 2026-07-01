import { Link } from 'react-router-dom';

function AboutPage() {
  return (
    <div className="bg-white overflow-hidden">
      
      {/* Hero */}
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-6 lg:px-8">
        <h1 className="text-6xl font-extrabold tracking-tight text-brand flex items-center gap-3">
          About Us
          <svg viewBox="0 0 100 100" fill="currentColor" className="h-11 w-11 text-brand">
            <circle cx="25" cy="30" r="9" />
            <circle cx="43" cy="18" r="10" />
            <circle cx="63" cy="18" r="10" />
            <circle cx="81" cy="32" r="9" />
            <path d="M 52,43 C 33,43 21,57 21,72 C 21,87 34,96 52,96 C 70,96 83,87 83,72 C 83,57 71,43 52,43 Z" />
          </svg>
        </h1>
        <p className="mt-2 text-lg font-medium text-slate-600">Our mission, our story, and the community we serve.</p>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-16 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Left Column: Image with decoration */}
          <div className="relative">
            {/* Background decorative blob */}
            <svg viewBox="0 0 200 200" className="absolute -top-10 -left-10 w-full h-full text-brand/10 transform scale-110 -z-10" fill="currentColor">
              <path d="M42.7,-73.4C55.9,-67.2,67.6,-57,75.4,-44.2C83.2,-31.4,87.2,-15.7,85.6,-0.9C84,13.9,76.8,27.8,67.6,39.8C58.3,51.8,47.1,61.9,34,68.7C20.9,75.6,5.9,79.2,-8.1,77.5C-22.1,75.9,-35.1,68.9,-46.9,60.2C-58.7,51.6,-69.3,41.2,-76.4,28.6C-83.6,16,-87.3,1.3,-84.9,-12.3C-82.5,-26,-74,-38.5,-63.3,-48.5C-52.5,-58.4,-39.6,-65.7,-26.4,-71.4C-13.1,-77,1,-80.9,14.7,-79.1C28.4,-77.2,29.5,-79.7,42.7,-73.4Z" transform="translate(100 100)" />
            </svg>
            
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
              <img 
                src="/images/about.jpg" 
                alt="Rescue kitten" 
                className="w-full h-full object-cover aspect-[4/5] sm:aspect-square lg:aspect-[4/5]" 
              />
              
              {/* Floating badge */}
              <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-white flex items-center gap-4">
                 <div className="h-12 w-12 bg-brand/10 rounded-full flex items-center justify-center text-brand">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                 </div>
                 <div>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Since</p>
                   <p className="text-xl font-black text-brand">2018</p>
                 </div>
              </div>
            </div>
          </div>
          
          {/* Right Column: Text & Stats */}
          <div className="flex flex-col justify-center">
            <h2 className="text-4xl font-extrabold text-brand mb-6">Our Story</h2>
            
            <div className="space-y-5 text-lg leading-relaxed text-slate-600">
              <p>
                Pawsitive Transformations is a foster-based kitten rescue dedicated to saving neonatal and special-needs kittens. Our volunteers provide round-the-clock bottle feeding, medical support, and socialization until each kitten is ready for adoption.
              </p>
              <p>
                We believe every kitten deserves a chance at a happy, healthy life — and a loving forever home. Through our community outreach and education, we strive to reduce the population of homeless cats and promote responsible pet ownership.
              </p>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-6 mt-10">
              <div className="rounded-2xl border border-brand/20 bg-brand/5 p-6 border-l-4 border-l-brand">
                <p className="text-4xl font-black text-brand">2,450+</p>
                <p className="mt-1 text-sm font-bold text-slate-600 uppercase tracking-wider">Cats Rescued</p>
              </div>
              <div className="rounded-2xl border border-brand/20 bg-brand/5 p-6 border-l-4 border-l-brand">
                <p className="text-4xl font-black text-brand">15k+</p>
                <p className="mt-1 text-sm font-bold text-slate-600 uppercase tracking-wider">Lives Touched</p>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/kittens" className="rounded-xl bg-brand px-8 py-3.5 text-base font-bold text-white shadow-sm hover:bg-brand-dark transition-colors">
                Meet Our Cats
              </Link>
              <Link to="/get-involved" className="rounded-xl border-2 border-brand/20 bg-white px-8 py-3.5 text-base font-bold text-brand hover:border-brand transition-colors">
                Get Involved
              </Link>
            </div>
            
          </div>
          
        </div>
      </div>
      
    </div>
  );
}

export default AboutPage;
