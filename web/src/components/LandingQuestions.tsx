import { ChevronDown } from 'lucide-react';

const questions = [
  {
    title: 'What information will I need?',
    answer: 'Choose the emergency type, describe what is happening, and give its location. Include an address or nearby landmark to help identify the place.',
  },
  {
    title: 'Do I need to add photos?',
    answer: 'Photos are optional. Add them only if it is safe. A clear description and location come first.',
  },
  {
    title: 'What happens after I submit?',
    answer: 'Staff review the report before a rescue team is assigned. Return to My reports to follow its status and any updates. Submitting does not guarantee immediate rescue.',
  },
  {
    title: 'Do I need an account?',
    answer: 'Yes. Residents sign in to the Rescue Reports mobile app to send and track reports. Administrators use the website to review reports and coordinate the response.',
  },
];

export default function LandingQuestions() {
  return <section className="service-questions" aria-labelledby="report-questions-title">
    <div className="service-questions__intro">
      <h2 id="report-questions-title">Before you send<br />a report.</h2>
      <p>Know what to include and what to expect after you submit.</p>
    </div>
    <div className="service-questions__list">
      {questions.map(question => <details key={question.title}>
        <summary>{question.title}<ChevronDown size={20} aria-hidden="true" /></summary>
        <div><p>{question.answer}</p></div>
      </details>)}
    </div>
  </section>;
}
