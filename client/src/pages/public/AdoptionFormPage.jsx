import ApplicationForm from '../../components/ApplicationForm';

function AdoptionFormPage() {
  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      {/* Custom Hero with Decorative Elements */}
      <div className="relative bg-white border-b border-slate-200 overflow-hidden">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
           {/* Top Left Blob */}
           <svg viewBox="0 0 200 200" className="absolute -top-24 -left-16 w-64 h-64 text-brand/5" fill="currentColor">
              <path d="M42.7,-73.4C55.9,-67.2,67.6,-57,75.4,-44.2C83.2,-31.4,87.2,-15.7,85.6,-0.9C84,13.9,76.8,27.8,67.6,39.8C58.3,51.8,47.1,61.9,34,68.7C20.9,75.6,5.9,79.2,-8.1,77.5C-22.1,75.9,-35.1,68.9,-46.9,60.2C-58.7,51.6,-69.3,41.2,-76.4,28.6C-83.6,16,-87.3,1.3,-84.9,-12.3C-82.5,-26,-74,-38.5,-63.3,-48.5C-52.5,-58.4,-39.6,-65.7,-26.4,-71.4C-13.1,-77,1,-80.9,14.7,-79.1C28.4,-77.2,29.5,-79.7,42.7,-73.4Z" transform="translate(100 100)" />
           </svg>
           
           {/* Floating Paw Right */}
           <svg viewBox="0 0 100 100" fill="currentColor" className="absolute top-8 right-[15%] w-16 h-16 text-brand/10 transform rotate-12">
             <circle cx="25" cy="30" r="9" />
             <circle cx="43" cy="18" r="10" />
             <circle cx="63" cy="18" r="10" />
             <circle cx="81" cy="32" r="9" />
             <path d="M 52,43 C 33,43 21,57 21,72 C 21,87 34,96 52,96 C 70,96 83,87 83,72 C 83,57 71,43 52,43 Z" />
           </svg>
           
           {/* Floating Paw Left */}
           <svg viewBox="0 0 100 100" fill="currentColor" className="absolute bottom-6 left-[20%] w-12 h-12 text-brand/10 transform -rotate-12">
             <circle cx="25" cy="30" r="9" />
             <circle cx="43" cy="18" r="10" />
             <circle cx="63" cy="18" r="10" />
             <circle cx="81" cy="32" r="9" />
             <path d="M 52,43 C 33,43 21,57 21,72 C 21,87 34,96 52,96 C 70,96 83,87 83,72 C 83,57 71,43 52,43 Z" />
           </svg>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-14 lg:px-8 text-center z-10">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-brand/10 text-brand mb-6 shadow-sm ring-8 ring-brand/5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
              <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" />
            </svg>
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-brand">
            Adoption Application
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-600 max-w-2xl mx-auto">
            Ready to add a new furry member to your family? Fill out the application below, and our adoption counselors will review it shortly.
          </p>
        </div>
      </div>
      
      <div className="-mt-8 relative z-20">
        <ApplicationForm defaultType="Adoption" lockType />
      </div>
    </div>
  );
}

export default AdoptionFormPage;
