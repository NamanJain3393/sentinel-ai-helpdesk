"use client";

import Link from "next/link"
import { BarChart3, MessageCircle, Settings, ArrowRight, Sparkles, Zap, Shield } from "lucide-react"
import { motion } from "framer-motion"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-900 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-3xl -z-10" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16 sm:pt-32 sm:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6"
            >
              <Sparkles className="h-4 w-4" />
              <span>AI-Powered Support Platform</span>
            </motion.div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 bg-clip-text text-transparent leading-tight">
              Smart Support Dashboard
            </h1>
            <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-8 leading-relaxed">
              Transform your support operations with powerful analytics, intelligent automation, and AI-driven insights
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/analytics"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Explore Analytics
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/chatbot"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  Try Chatbot
                  <MessageCircle className="h-5 w-5" />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Everything you need to excel
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Powerful tools designed to streamline your support workflow and boost team productivity
          </p>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Data Analytics Card */}
          <Link href="/analytics">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group h-full cursor-pointer rounded-2xl bg-white dark:bg-slate-900 p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-600 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="mb-6 inline-flex rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 p-4 shadow-sm">
                <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Data Analytics</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Gain insights into your support metrics, response times, and performance trends with advanced analytics
                dashboards.
              </p>
              <div className="flex items-center text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-2 transition-transform duration-200">
                Explore Analytics
                <ArrowRight className="h-5 w-5 ml-2" />
              </div>
            </motion.div>
          </Link>

          {/* Chatbot Assistant Card */}
          <Link href="/chatbot">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group h-full cursor-pointer rounded-2xl bg-white dark:bg-slate-900 p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-600 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="mb-6 inline-flex rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 p-4 shadow-sm">
                <MessageCircle className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">AI Chatbot</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Communicate with our AI-powered assistant to get quick answers, automate tasks, and improve support
                efficiency.
              </p>
              <div className="flex items-center text-purple-600 dark:text-purple-400 font-semibold group-hover:translate-x-2 transition-transform duration-200">
                Start Chatting
                <ArrowRight className="h-5 w-5 ml-2" />
              </div>
            </motion.div>
          </Link>

          {/* Admin Dashboard Card */}
          <Link href="/admin">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group h-full cursor-pointer rounded-2xl bg-white dark:bg-slate-900 p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-600 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="mb-6 inline-flex rounded-xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 p-4 shadow-sm">
                <Settings className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Admin Dashboard</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Manage unresolved issues, add solutions, and maintain your support ticket database with ease.
              </p>
              <div className="flex items-center text-green-600 dark:text-green-400 font-semibold group-hover:translate-x-2 transition-transform duration-200">
                Manage Tickets
                <ArrowRight className="h-5 w-5 ml-2" />
              </div>
            </motion.div>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-center p-6 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80"
          >
            <div className="inline-flex rounded-lg bg-blue-100 dark:bg-blue-900/30 p-3 mb-4">
              <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Lightning Fast</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">Real-time analytics and instant responses</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-center p-6 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80"
          >
            <div className="inline-flex rounded-lg bg-purple-100 dark:bg-purple-900/30 p-3 mb-4">
              <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Secure & Reliable</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">Enterprise-grade security and uptime</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="text-center p-6 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80"
          >
            <div className="inline-flex rounded-lg bg-green-100 dark:bg-green-900/30 p-3 mb-4">
              <Sparkles className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">AI-Powered</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">Intelligent automation and insights</p>
          </motion.div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7 }}
          className="text-center p-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white shadow-xl"
        >
          <h3 className="text-3xl font-bold mb-4">Ready to get started?</h3>
          <p className="text-blue-100 dark:text-blue-200 mb-8 max-w-2xl mx-auto">
            Join thousands of teams using our platform to deliver exceptional support experiences
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/analytics"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Explore Dashboard
                <ArrowRight className="h-5 w-5" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/chatbot"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl border-2 border-blue-400 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Try Chatbot
                <MessageCircle className="h-5 w-5" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
