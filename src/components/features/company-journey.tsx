
const journeyData = [
  { year: "2018", event: "Company founded with a vision to revolutionize the tech consulting industry." },
  { year: "2019", event: "Expanded our services to include AI and Machine Learning solutions." },
  { year: "2020", event: "Achieved AWS Advanced Consulting Partner status." },
  { year: "2021", event: "Opened our first international office and doubled our team size." },
  { year: "2022", event: "Launched our flagship Enterprise AI Copilot product." },
  { year: "2023", event: "Recognized as a leader in cloud and AI solutions by a major tech publication." },
];

export default function CompanyJourney() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Our Journey</h2>
        <div className="relative">
          <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-border"></div>
          {journeyData.map((item, index) => (
            <div key={index} className={`flex items-center w-full mb-8 ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className={`w-5/12 ${index % 2 === 0 ? 'text-right pr-8' : 'text-left pl-8'}`}>
                <p className="font-bold text-lg">{item.year}</p>
                <p className="text-muted-foreground">{item.event}</p>
              </div>
              <div className="w-1/12 flex justify-center">
                <div className="w-4 h-4 bg-primary rounded-full z-10"></div>
              </div>
              <div className="w-5/12"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}