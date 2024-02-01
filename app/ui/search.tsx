'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

export default function Search() {
  const searchParams = useSearchParams();
  // Allows you to access the parameters of the current URL. For example, the search params for this
  // URL /dashboard/invoices?page=1&query=pending would look like this: {page: '1', query: 'pending'}.

  const pathname = usePathname();
  // [usePathname] lets you read the current URL's pathname. For example, for the route /dashboard/invoices,
  // usePathname would return '/dashboard/invoices'.

  const { replace } = useRouter();
  // useRouter hook allows you to programmatically change routes inside Client Components.

  const handleSearch = useDebouncedCallback((term) => {
    const params = new URLSearchParams(searchParams);
    // URLSearchParams is a Web API that provides utility methods for manipulating the URL query
    // parameters. Instead of creating a complex string literal,
    // you can use it to get the params string like ?page=1&query=a.

    params.set('page', '1');
    //when the user types a new search query, you want to reset the page number to 1.

    if (term) {
      params.set('query', term); // set query = 'term' which is passed from onChange
    } else {
      params.delete('query'); // delete query if term is empty
    }
    replace(`${pathname}?${params.toString()}`);
    // updates the current URL with the user's search data (term)
    // for example, /dashboard/invoices?query=lee if the user searches for "Lee".
  }, 300);

  return (
    <div className="relative flex flex-1 flex-shrink-0">
      <label htmlFor="search" className="sr-only">
        Search
      </label>
      <input
        className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
        // placeholder={placeholder}
        onChange={(e) => {
          handleSearch(e.target.value);
        }}
        // To ensure the input field is in sync with the URL and will be populated when sharing,
        // pass a defaultValue to input by reading from searchParams
        defaultValue={searchParams.get('query')?.toString()}
      />
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
    </div>
  );
}
