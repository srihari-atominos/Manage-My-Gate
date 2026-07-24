import { Button } from 'src/components/ui/button';
import ErrorImg from '/src/assets/images/backgrounds/errorimg.svg';
import { Link } from 'react-router';

const Page403 = () => (
  <div className="h-screen flex items-center justify-center bg-white dark:bg-dark">
    <div className="text-center px-4">
      <img src={ErrorImg} alt="error" className="mb-4 mx-auto" width={500} />
      <h1 className="text-ld text-4xl mb-4 font-bold">Access Denied (403)</h1>
      <h6 className="text-xl text-ld text-gray-500 mb-6">
        You do not have the required permissions to access this page.
      </h6>
      <Button
        variant="default"
        className="w-fit mt-2 mx-auto rounded-md"
        asChild
      >
        <Link to="/">Go Back to Home</Link>
      </Button>
    </div>
  </div>
);

export default Page403;
