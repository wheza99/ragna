import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function HeroSection() {
  return (
    <>
      <section className={cn('py-32')}>
        <div className="max-w-7xl mx-auto">
          <div className="mx-auto mb-12 flex max-w-5xl flex-col items-center gap-6 ">
            <a
              href="https://pabrikstartup.id"
              className="flex items-center gap-2 rounded-full bg-muted py-1 p-4"
            >
              <div className="flex items-center gap-1">
                <p className="text-sm font-semibold">Backed by Pabrik Startup</p>
                <ChevronRight className="h-4 w-4" />
              </div>
            </a>
            <h1 className="text-center text-5xl font-semibold md:text-7xl">
              Transform the way you do business
            </h1>
            <p className="text-center text-lg text-muted-foreground md:text-xl">
              Streamline your workflow, collaborate with your team, and boost
              productivity with our innovative platform.
            </p>
            <div className="flex gap-3">
              <Link to="/login">
                <Button size="lg">Get started</Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline">
                  Learn more
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              14-day free trial. No obligations.
            </p>
          </div>
          <img
            src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
            alt="placeholder"
            className="mx-auto max-h-[540px] rounded-lg object-cover drop-shadow sm:aspect-video"
          />
        </div>
      </section>
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Vite Hono. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Terms
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </>
  )
}
