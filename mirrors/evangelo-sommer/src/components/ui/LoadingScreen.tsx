"use client";
import { useLoadingStore } from "@/store/loadingStore";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingScreen() {
  const { progress, isLoaded, loadingStage } = useLoadingStore();

  return (
    <AnimatePresence>
      {!isLoaded && (
        <motion.div
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <div className="text-center">
            {/* Loading Ring */}
            <div className="relative mb-8 w-32 h-32 mx-auto">
              {/* Background ring */}
              <div className="w-full h-full border-4 border-gray-800 rounded-full"></div>

              {/* Progress ring */}
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="4"
                  fill="none"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="58"
                  stroke="white"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 58}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 58 * (1 - progress / 100),
                  }}
                  transition={{ duration: 0.5 }}
                />
              </svg>

              {/* Spinning element */}
              <motion.div
                className="absolute inset-0 w-full h-full border-4 border-t-white border-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {/* Progress Percentage */}
            <motion.div
              className="text-4xl font-bold text-white mb-4"
              key={Math.round(progress)}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              {Math.round(progress)}%
            </motion.div>

            {/* Loading Stage */}
            <motion.p
              className="text-lg text-gray-300 mb-8 max-w-md"
              key={loadingStage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {loadingStage}
            </motion.p>

            {/* Progress Bar */}
            <div className="w-80 h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-tactical-grey-1000 to-tactical-brown-500"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            <p className="text-xs text-tactical-grey-500 mt-6">
              Evangelo Sommer Portfolio - 3D Gallery Experience
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
