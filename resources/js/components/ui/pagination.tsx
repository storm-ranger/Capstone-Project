import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginationProps {
    links: PaginationLink[];
    className?: string;
}

export function Pagination({ links, className }: PaginationProps) {
    if (links.length <= 3) return null;

    const prevLink = links[0];
    const nextLink = links[links.length - 1];
    const pageLinks = links.slice(1, -1);

    return (
        <nav className={cn("flex items-center justify-center gap-1", className)}>
            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                asChild={!!prevLink.url}
                disabled={!prevLink.url}
            >
                {prevLink.url ? (
                    <Link href={prevLink.url} preserveState>
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                ) : (
                    <span>
                        <ChevronLeft className="h-4 w-4" />
                    </span>
                )}
            </Button>

            {pageLinks.map((link, index) => {
                if (link.label === '...') {
                    return (
                        <span key={index} className="px-2 text-muted-foreground">
                            ...
                        </span>
                    );
                }

                return (
                    <Button
                        key={index}
                        variant={link.active ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8"
                        asChild={!!link.url}
                        disabled={!link.url}
                    >
                        {link.url ? (
                            <Link href={link.url} preserveState>
                                {link.label}
                            </Link>
                        ) : (
                            <span>{link.label}</span>
                        )}
                    </Button>
                );
            })}

            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                asChild={!!nextLink.url}
                disabled={!nextLink.url}
            >
                {nextLink.url ? (
                    <Link href={nextLink.url} preserveState>
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                ) : (
                    <span>
                        <ChevronRight className="h-4 w-4" />
                    </span>
                )}
            </Button>
        </nav>
    );
}
