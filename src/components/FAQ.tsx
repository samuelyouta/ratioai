import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does the AI food scanning work?",
    answer:
      "Simply take a photo of your meal and our AI instantly identifies the food items, estimates portions, and provides a detailed macro breakdown — calories, protein, carbs, and fat — using USDA-verified nutrition data.",
  },
  {
    question: "Is RatioAi free to use?",
    answer:
      "We'll offer a generous free tier when we launch. Early waitlist members will get extended free access and exclusive perks as a thank-you for joining early.",
  },
  {
    question: "How accurate is the nutrition analysis?",
    answer:
      "Our AI is trained on thousands of food images and cross-references results with the USDA food database. Accuracy improves over time as you use the app and confirm or adjust results.",
  },
  {
    question: "When will RatioAi launch?",
    answer:
      "We're currently in beta testing. Waitlist members will be the first to get access. Join now to secure your spot — we'll email you as soon as it's ready.",
  },
  {
    question: "Can I track custom meals and recipes?",
    answer:
      "Yes! You'll be able to save custom meals, build recipes, and track them with a single tap. The AI learns your eating patterns to make logging even faster.",
  },
];

const FAQ = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.7 }}
      className="z-10 w-full max-w-sm mb-10"
    >
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          FAQ
        </span>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {faqs.map((faq, index) => (
          <AccordionItem
            key={index}
            value={`faq-${index}`}
            className="rounded-xl bg-card/60 border border-border/50 px-4"
          >
            <AccordionTrigger className="text-xs font-bold text-foreground hover:no-underline py-3">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-3">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>
  );
};

export default FAQ;
