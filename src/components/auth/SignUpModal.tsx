import { Link } from "react-router-dom";
import { GraduationCap, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface SignUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignUpModal({ open, onOpenChange }: SignUpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Join Educator Hub</DialogTitle>
          <DialogDescription className="text-center">
            Choose how you'd like to get started
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Link
            to="/signup/teacher"
            onClick={() => onOpenChange(false)}
            className="group"
          >
            <motion.div
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border bg-card hover:border-primary hover:shadow-elevated transition-all duration-300 text-center"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <GraduationCap className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Sign Up as Teacher</p>
                <p className="text-xs text-muted-foreground mt-1">Share your expertise globally</p>
              </div>
            </motion.div>
          </Link>

          <Link
            to="/signup/student"
            onClick={() => onOpenChange(false)}
            className="group"
          >
            <motion.div
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border bg-card hover:border-accent hover:shadow-elevated transition-all duration-300 text-center"
            >
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <BookOpen className="w-7 h-7 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Sign Up as Student</p>
                <p className="text-xs text-muted-foreground mt-1">Find your perfect tutor</p>
              </div>
            </motion.div>
          </Link>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-2">
          Already have an account?{" "}
          <Link
            to="/login"
            onClick={() => onOpenChange(false)}
            className="text-primary font-semibold hover:underline"
          >
            Log In
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
