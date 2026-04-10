import CompanyMission from '@/components/features/company-mission';
import WhyChooseUsDetailed from '@/components/features/why-choose-us-detailed';
import CompanyJourney from '@/components/features/company-journey';
import CoreValues from '@/components/features/core-values';
import TeamPreview from '@/components/features/team-preview';

export default function AboutPage() {
  return (
    <>
      <CompanyMission />
      <WhyChooseUsDetailed />
      <CompanyJourney />
      <CoreValues />
      <TeamPreview />
    </>
  );
}