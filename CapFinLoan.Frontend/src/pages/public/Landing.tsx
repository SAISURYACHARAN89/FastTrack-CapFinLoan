import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, MeshDistortMaterial } from '@react-three/drei';
import { ArrowRight, Shield, Zap, TrendingUp, DollarSign, Clock, FileText } from 'lucide-react';
import * as THREE from 'three';

// 3D Abstract Shape Component
function AbstractShape() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={meshRef} scale={1.05}>
        <torusKnotGeometry args={[1, 0.3, 128, 32]} />
        <MeshDistortMaterial
          color="#c3c0ff"
          envMapIntensity={1.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
          metalness={0.9}
          roughness={0.1}
          distort={0.2}
          speed={2}
        />
      </mesh>
    </Float>
  );
}

export function Landing() {
  const navigate = useNavigate();

  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: timelineScroll } = useScroll({
    target: timelineRef,
    offset: ["start center", "end center"]
  });
  
  const scaleY = useSpring(timelineScroll, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Page level scroll for subtle background color shifts
  const { scrollYProgress: pageScroll } = useScroll();
  const overlayColor = useTransform(
    pageScroll,
    [0, 0.3, 0.6, 1],
    [
      "rgba(15, 23, 42, 0)",       // Transparent at top
      "rgba(76, 215, 246, 0.05)",  // Subtle Cyan tint
      "rgba(195, 192, 255, 0.05)", // Subtle Purple tint
      "rgba(0, 255, 136, 0.03)"    // Subtle Green tint near footer
    ]
  );

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 20 },
    },
  };

  return (
    <div className="min-h-screen w-full bg-surface mesh-gradient-bg flex flex-col relative selection:bg-primary/30 overflow-x-hidden">
      
      {/* Subtle Scroll-Driven Color Overlay */}
      <motion.div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{ backgroundColor: overlayColor }}
      />

      {/* Background 3D Canvas - Fixed at top but fades out */}
      <div className="absolute inset-x-0 top-0 h-screen z-0 opacity-40 pointer-events-none" style={{ maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Environment preset="city" />
          <AbstractShape />
        </Canvas>
      </div>

      {/* Navigation */}
      <nav className="w-full relative z-10 px-6 py-6 md:px-12 lg:px-24 flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight text-on-surface">CapFinLoan</span>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex gap-4 items-center"
        >
          <button 
            onClick={() => navigate('/login')}
            className="text-on-surface-variant hover:text-primary transition-colors font-medium px-4 py-2"
          >
            Log in
          </button>
          <button 
            onClick={() => navigate('/signup')}
            className="bg-primary text-on-primary hover:bg-primary/90 transition-all font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0"
          >
            Sign up
          </button>
        </motion.div>
      </nav>

      {/* Main Hero Content */}
      <main className="flex-1 relative z-10 flex flex-col justify-center px-6 md:px-12 lg:px-24 pt-20 pb-32">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-sm font-medium text-primary tracking-wide">Next-Gen Capital Financing</span>
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-on-surface leading-[1.1] mb-8">
            Your Streamlined <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-tertiary">
              Path to Capital.
            </span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-lg md:text-xl text-on-surface-variant max-w-2xl mb-12 leading-relaxed backdrop-blur-sm rounded-lg p-1">
            Experience frictionless loan processing. From application to approval, CapFinLoan gives you the clarity, speed, and security you need for financial success.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => navigate('/signup')}
              className="flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold text-lg px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all"
            >
              Start Application
              <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2 glass-panel text-on-surface font-semibold text-lg px-8 py-4 rounded-2xl hover:bg-surface-container-high transition-all"
            >
              Sign into Dashboard
            </button>
          </motion.div>
        </motion.div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 px-6 md:px-12 lg:px-24 py-24 bg-surface-container-lowest/50 border-t border-white/5 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: -30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, type: "spring", bounce: 0.3 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold text-on-surface mb-6 tracking-tight">Designed for speed & transparency</h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto text-lg leading-relaxed">
              Our financial loan management system eliminates paperwork, automates credit checks, and gives you real-time visibility into your capital.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Instant Decisions", desc: "Our automated risk assessment engine provides preliminary decisions within hours, not weeks." },
              { icon: Shield, title: "Bank-Grade Security", desc: "End-to-end encryption ensures your financial data and identity are protected at all times." },
              { icon: TrendingUp, title: "Competitive Rates", desc: "We leverage a network of capital providers to ensure you get the best possible terms." },
              { icon: FileText, title: "Paperless Process", desc: "Upload documents securely and sign everything digitally. No physical branches required." },
              { icon: Clock, title: "Real-time Tracking", desc: "Monitor your application status 24/7 through your dedicated dashboard." },
              { icon: DollarSign, title: "Flexible Repayment", desc: "Tailor your repayment schedule to match your business's cash flow cycles." }
            ].map((feature, idx) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ type: "spring", bounce: 0.4, duration: 0.8, delay: idx * 0.1 }}
                whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2 } }}
                key={idx} 
                className="relative glass-panel p-8 rounded-3xl flex flex-col gap-4 group overflow-hidden border border-white/5 hover:border-primary/30 shadow-lg hover:shadow-primary/10"
              >
                {/* Dynamic hover backdrop glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 w-14 h-14 rounded-2xl bg-surface-container-highest flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300 shadow-inner group-hover:shadow-primary/20">
                  <feature.icon className="w-7 h-7 text-primary group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" />
                </div>
                <h3 className="relative z-10 text-xl font-bold text-on-surface mt-2 group-hover:text-primary transition-colors duration-300">{feature.title}</h3>
                <p className="relative z-10 text-on-surface-variant leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section - Timeline */}
      <section className="relative z-10 px-6 md:px-12 lg:px-24 py-32 bg-surface-container-low overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-5xl font-extrabold text-on-surface mb-6 tracking-tight">How CapFinLoan Works</h2>
            <p className="text-on-surface-variant text-lg">Your journey from application to funded capital in 4 simple steps.</p>
          </div>

          <div className="relative" ref={timelineRef}>
            {/* The background track */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-white/5 -ml-[0.5px] rounded-full" />
            
            {/* The animated filling track */}
            <motion.div 
              className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-primary -ml-[0.5px] origin-top rounded-full shadow-[0_0_15px_rgba(76,215,246,0.6)]"
              style={{ scaleY }}
            />

            <div className="flex flex-col gap-16 md:gap-24 relative z-10">
              {[
                { step: "01", title: "Create Your Profile", desc: "Sign up in seconds. Tell us about your capital needs and your business.", align: "right" },
                { step: "02", title: "Submit Application", desc: "Fill out a streamlined digital application and upload required documents securely.", align: "left" },
                { step: "03", title: "Underwriting & Approval", desc: "Our team and automated systems review your application swiftly.", align: "right" },
                { step: "04", title: "Receive Funds", desc: "Once approved, sign your contract digitally and get capital wired to your account.", align: "left" }
              ].map((item, idx) => (
                <div key={idx} className={`relative flex flex-col md:flex-row items-start md:items-center ${item.align === 'left' ? 'md:flex-row-reverse' : ''}`}>
                  
                  {/* Center Node */}
                  <div className="absolute left-8 md:left-1/2 w-12 h-12 -ml-6 md:-ml-6 rounded-full bg-surface-container-low border-[4px] border-surface-container-highest z-20 flex items-center justify-center top-0 md:top-1/2 md:-translate-y-1/2">
                     <motion.div 
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ type: "spring", delay: 0.2, bounce: 0.5 }}
                        className="w-4 h-4 rounded-full bg-primary shadow-[0_0_10px_rgba(76,215,246,0.8)]"
                     />
                  </div>

                  {/* Content Box */}
                  <div className={`w-full md:w-1/2 flex pt-2 md:pt-0 pl-24 md:pl-0 ${item.align === 'left' ? 'justify-start md:pl-16' : 'justify-end md:pr-16'}`}>
                    <motion.div 
                      initial={{ opacity: 0, x: item.align === 'left' ? 50 : -50, y: 20 }}
                      whileInView={{ opacity: 1, x: 0, y: 0 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
                      className="glass-panel p-8 rounded-3xl w-full group hover:border-primary/40 transition-all shadow-lg hover:shadow-primary/10 relative overflow-hidden"
                    >
                      <div className="absolute top-[-10px] right-2 p-6 text-8xl font-extrabold text-white/5 pointer-events-none group-hover:text-primary/10 transition-colors duration-500">{item.step}</div>
                      <h3 className="text-2xl font-bold text-on-surface mb-3 relative z-10">{item.title}</h3>
                      <p className="text-on-surface-variant leading-relaxed relative z-10">{item.desc}</p>
                    </motion.div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer / Contact */}
      <footer className="relative z-10 bg-surface-container-lowest border-t border-white/5 pt-16 pb-8 px-6 md:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-bold tracking-tight text-on-surface">CapFinLoan</span>
            </div>
            <p className="text-on-surface-variant max-w-sm mb-6">
              The modern financial loan management system built for speed, transparency, and growth.
            </p>
            <div className="flex items-center gap-4 text-on-surface-variant">
              {/* Dummy social links */}
              <div className="w-10 h-10 rounded-full glass-panel flex items-center justify-center cursor-pointer hover:text-primary transition-colors">𝕏</div>
              <div className="w-10 h-10 rounded-full glass-panel flex items-center justify-center cursor-pointer hover:text-primary transition-colors">in</div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-on-surface mb-6">Product</h4>
            <ul className="space-y-4 text-on-surface-variant">
              <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Security</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">API</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-on-surface mb-6">Contact</h4>
            <ul className="space-y-4 text-on-surface-variant">
              <li>support@capfinloan.com</li>
              <li>1-800-CAP-LOAN</li>
              <li>123 Financial District,<br/>New York, NY 10004</li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-on-surface-variant">
          <p>&copy; {new Date().getFullYear()} CapFinLoan. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-on-surface transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-on-surface transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
