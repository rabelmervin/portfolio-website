import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <img src="/portfolio-website/img/graphily_logo.png" alt="Graphily Logo" className={styles.heroLogo} />
          <Heading as="h1" className={styles.heroTitle}>
            {siteConfig.title}
          </Heading>
          <p className={styles.heroSubtitle}>
            {siteConfig.tagline}
          </p>
          <div className={styles.buttons}>
            <Link
              className={clsx('button button--primary button--lg', styles.glowButton)}
              to="/docs/overview">
              Get Started
            </Link>
            <Link
              className="button button--secondary button--lg button--outline"
              to="https://github.com/rabelmervin/Graphily">
              View on GitHub
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function HomepageFeatures() {
  const FeatureList = [
    {
      title: 'Lightning Fast',
      description: 'Powered by WebAssembly for near-native performance, leaving traditional GraphQL servers in the dust.',
      icon: '⚡',
    },
    {
      title: 'MySQL Native',
      description: 'Generates optimized SQL queries from your GraphQL requests instantly, avoiding the N+1 problem completely.',
      icon: '🗄️',
    },
    {
      title: 'Secure by Default',
      description: 'Built-in Role-Based Access Control (RBAC) and query cost analysis out of the box.',
      icon: '🛡️',
    },
  ];

  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <div key={idx} className={clsx('col col--4')}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>{props.icon}</div>
                <Heading as="h3">{props.title}</Heading>
                <p>{props.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Welcome to ${siteConfig.title}`}
      description="WebAssembly-Native GraphQL from MySQL">
      <main className={styles.mainWrapper}>
        <HomepageHeader />
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
