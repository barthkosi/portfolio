"use client";

import Image from "next/image";
import Button from "@/components/interface/Button";

export default function JoinFamilySection() {
    return (
        <section className="flex flex-col items-center px-4 md:px-8 py-12 gap-8 text-center">
            <div className="flex items-center justify-center gap-3">
                <Image
                    src="/images/home/cta-laurel-left.png"
                    alt=""
                    width={24}
                    height={53}
                    className="h-[53px] w-6 object-contain dark:invert"
                    aria-hidden="true"
                />
                <div className="flex flex-col items-center">
                    <p className="font-[var(--font-family-blog)] text-[10px] leading-[15px] tracking-[0.25px] text-[var(--content-secondary)]">
                        Design Partner
                    </p>
                    <p className="label-s text-[var(--content-primary)]">
                        Barth Kosi
                    </p>
                </div>
                <Image
                    src="/images/home/cta-laurel-right.png"
                    alt=""
                    width={24}
                    height={53}
                    className="h-[53px] w-6 object-contain dark:invert"
                    aria-hidden="true"
                />
            </div>

            <div className="flex w-full max-w-[720px] flex-col items-center gap-3">
                <h2 className="max-w-[720px] text-balance text-[2.25rem] font-semibold leading-[2.5rem] tracking-[-1.2px] md:text-[2.75rem] md:leading-[3rem] md:tracking-[-1.6px]">
                    Join the family and build great products with me
                </h2>
                <p className="body-l max-w-[720px] text-pretty text-[var(--content-secondary)]">
                    From early-stage concepts to established brands, my work has helped projects find their voice and create emotional connections that have driven brand loyalty and meaningful engagement.
                </p>
            </div>

            <Button
                href="https://cal.com/barthkosi/intro"
                openInNewTab
                variant="secondary"
            >
                Book a call
            </Button>
        </section>
    );
}
