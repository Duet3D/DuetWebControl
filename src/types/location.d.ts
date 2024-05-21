interface Location {
    /**
     * Reloads the current page.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Location/reload)
     * @param forceReload Reload the page even if the cache is still valid
     */
    reload(forceReload?: boolean): void;
}
