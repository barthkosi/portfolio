import { BlogTextBlock } from "@/components/BlogTextBlock";
import { Navigation } from "@/components/Navigation";

export default function BlogPage() {
  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center bg-background-primary px-4 pt-[120px] pb-4 md:px-8 md:pb-8">
      <Navigation />
      <div className="relative z-[1] flex w-full shrink-0 flex-col items-center gap-16">
        <div className="relative flex w-full max-w-[960px] shrink-0 flex-col items-center gap-12">
          <div className="relative flex w-full max-w-[720px] shrink-0 flex-col items-center gap-5">
            <p className="w-full shrink-0 text-center label-sm text-content-tertiary">
              Feb 17, 2026
            </p>
            <BlogTextBlock
              variant="Heading"
              type="h1"
              heading="What is the benchmark for replacement?"
            />
            <p className="w-full max-w-[624px] shrink-0 text-center label-lg text-content-tertiary">
              On taste, agency and the death of average.
            </p>
          </div>
          <div className="relative aspect-[240/135] w-full shrink-0 rounded-[16px]">
            <img
              src="/images/blog-cover.png"
              alt="What is the benchmark for replacement?"
              className="pointer-events-none absolute inset-0 size-full max-w-none rounded-[16px] object-cover"
            />
          </div>
        </div>

        <div className="relative flex w-full max-w-[640px] shrink-0 flex-col items-start">
          <BlogTextBlock
            variant="Quote"
            type="Paragraph"
            className="relative flex w-full shrink-0 flex-col items-center pb-6"
            body={
              <>
                “The only real power AI provides is up-skilling.
                <br />
                A mediocre person with AI will produce better-than-average results…at best. But a master of a craft with AI?
                <br />
                …that’s the real danger.”
              </>
            }
            author="-me probably."
          />

          <BlogTextBlock
            variant="Body"
            type="Paragraph"
            body="I keep returning to those lines, we have spent years asking whether the machines will take our seats. This question is simpler: Whose hands are on the handles and will they continue to stay that way?"
          />

          <BlogTextBlock
            variant="Heading"
            type="h2"
            heading="Replacement is a myth, only metamorphosis exists"
          />

          <BlogTextBlock
            variant="Body"
            type="Paragraph"
            body="Early industrial looms did not erase the art of weaving, cameras did not end painting, calculators did not kill mathematics. Google did not kill research. Each wave of new technology is met with resistance. We humans fight ever so desperately to prove our worth. We feel the need to reaffirm our importance, and anything that threatens it terrifies us. We pulled routine work downward toward machinery, yet it pushed refinement upward toward makers. Give an average worker the latest model and they climb, from ordinary to well “barely acceptable”. Hand the same model to a seasoned pro and you witness something miraculous: velocity spliced with vision."
          />

          <BlogTextBlock
            variant="Heading"
            type="h3"
            heading="Why not collective intelligence?"
          />

          <BlogTextBlock
            variant="Body"
            type="Paragraph"
            body="If you had all of human knowledge at your fingertips what would you do with it, humans have fantasized for years the power that would provide us, yet we scurry and hide at the sight of it."
          />

          <BlogTextBlock
            variant="Heading"
            type="h3"
            heading="The sky is no longer the limit"
          />

          <BlogTextBlock
            variant="Body"
            type="Paragraph"
            body="Skill compounds. AI is to a layman what a smartphone is to a Victorian–era child: a fun gimmick, a marvel beyond comprehension. But a Victorian–era child cannot vibecode a tech startup in a week. They can’t drive trends on social media, cancel artists or topple billion–dollar brands with a meme. Exceptional work becomes the new “good.” And “good” becomes the new mediocre. Excellence never sits still."
          />

          <BlogTextBlock
            variant="Body"
            type="Paragraph"
            body="Great work becomes the benchmark."
          />

          <BlogTextBlock
            variant="Body"
            type="Paragraph"
            body="Extraordinary work: that is where the future negotiates its terms."
          />

          <BlogTextBlock
            variant="Heading"
            type="h3"
            heading="Progress is an upward spiral, not a straight line"
          />

          <BlogTextBlock
            variant="Body"
            type="Paragraph"
            body="If you had all of human knowledge at your fingertips what would you do with it, humans have fantasized for years the power that would provide us, yet we scurry and hide at the sight of it."
          />

          <BlogTextBlock
            variant="Heading"
            type="h2"
            heading="The quiet power of partnership"
          />

          <BlogTextBlock
            variant="Body"
            type="Paragraph"
            body="Think of AI as an assistant that never tires, forgets, or sleeps. Yet the assistant waits for direction, your partner needs hypotheses, context, prompts. Agency remains human. Taste remains human. Meaning remains human. That is our true safeguard against obsolescence."
          />

          <BlogTextBlock
            variant="Heading"
            type="h3"
            heading="Where do we go from here?"
          />

          <BlogTextBlock
            variant="Body"
            type="Paragraph"
            body="I will proffer no guidance, agency remains in your hands, you must learn first hand what it means to be great, I cannot tell you the answer and neither can it."
          />

          <BlogTextBlock
            variant="Body"
            type="Paragraph"
            body="Cultivate your skills or you will sink. that is my only warning."
          />

          <BlogTextBlock
            variant="Heading"
            type="h2"
            heading="Closing note"
          />

          <BlogTextBlock
            variant="Body"
            type="Paragraph"
            body="Average will always exist, but it drifts upward each time a new tool arrives. The masters, however, keep sprinting ahead, turning ability into art. AI does not steal our future, it hands us a sharper chisel and dares us to carve deeper."
          />

          <BlogTextBlock
            variant="Body"
            type="Paragraph"
            body="We all stand the chance to be Michelangelo, but can we set the angel free?"
          />
        </div>
      </div>
    </div>
  );
}
