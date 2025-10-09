import  Hero from "../components/Hero";
import  About  from "../components/About";
import  Skills  from "../components/Skills";
import  Projects  from "../components/Projects";
import  Blogs  from "../components/Blogs";
import  Socials  from "../components/Socials";
import  Footer  from "../components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <About />
      <Skills />
      <Projects />
      <Blogs />
      <Socials />
      <Footer />
    </div>
  );
};

export default Index;