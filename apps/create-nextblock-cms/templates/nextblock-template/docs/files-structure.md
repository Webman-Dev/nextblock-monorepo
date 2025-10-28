├── .editorconfig
├── .env.exemple
├── .gitignore
├── .prettierignore
├── .prettierrc
├── .verdaccio
    └── config.yml
├── .vscode
    ├── extensions.json
    └── settings.json
├── LICENSE.md
├── README.md
├── apps
    └── nextblock
    │   ├── .swcrc
    │   ├── README.md
    │   ├── app
    │       ├── (auth-pages)
    │       │   ├── forgot-password
    │       │   │   └── page.tsx
    │       │   ├── layout.tsx
    │       │   ├── post-sign-in
    │       │   │   └── page.tsx
    │       │   ├── sign-in
    │       │   │   └── page.tsx
    │       │   └── sign-up
    │       │   │   └── page.tsx
    │       ├── [slug]
    │       │   ├── PageClientContent.tsx
    │       │   ├── page.tsx
    │       │   └── page.utils.ts
    │       ├── actions.ts
    │       ├── actions
    │       │   ├── email.ts
    │       │   ├── formActions.ts
    │       │   ├── languageActions.ts
    │       │   └── postActions.ts
    │       ├── api
    │       │   ├── process-image
    │       │   │   └── route.ts
    │       │   ├── revalidate-log
    │       │   │   └── route.ts
    │       │   ├── revalidate
    │       │   │   └── route.ts
    │       │   └── upload
    │       │   │   ├── presigned-url
    │       │   │       └── route.ts
    │       │   │   └── proxy
    │       │   │       └── route.ts
    │       ├── auth
    │       │   └── callback
    │       │   │   └── route.ts
    │       ├── blog
    │       │   ├── [slug]
    │       │   │   ├── PostClientContent.tsx
    │       │   │   ├── page.tsx
    │       │   │   └── page.utils.ts
    │       │   └── page.tsx
    │       ├── cms
    │       │   ├── CmsClientLayout.tsx
    │       │   ├── blocks
    │       │   │   ├── actions.ts
    │       │   │   ├── components
    │       │   │   │   ├── BackgroundSelector.tsx
    │       │   │   │   ├── BlockEditorArea.tsx
    │       │   │   │   ├── BlockEditorModal.tsx
    │       │   │   │   ├── BlockTypeCard.tsx
    │       │   │   │   ├── BlockTypeSelector.tsx
    │       │   │   │   ├── ColumnEditor.tsx
    │       │   │   │   ├── DeleteBlockButtonClient.tsx
    │       │   │   │   ├── DynamicRichTextEditor.tsx
    │       │   │   │   ├── EditableBlock.tsx
    │       │   │   │   ├── MediaLibraryModal.tsx
    │       │   │   │   ├── MenuBar.tsx
    │       │   │   │   ├── RichTextEditor.tsx
    │       │   │   │   ├── RoleAwareRichTextEditor.tsx
    │       │   │   │   ├── SectionConfigPanel.tsx
    │       │   │   │   ├── SortableBlockItem.tsx
    │       │   │   │   └── tiptap-extensions
    │       │   │   │   │   ├── AlertWidgetNode.ts
    │       │   │   │   │   ├── CtaWidgetNode.ts
    │       │   │   │   │   ├── DivNode.ts
    │       │   │   │   │   ├── FontSizeMark.ts
    │       │   │   │   │   ├── PreserveAllAttributesExtension.ts
    │       │   │   │   │   ├── StyleTagNode.ts
    │       │   │   │   │   └── components
    │       │   │   │   │       ├── AlertWidgetComponent.tsx
    │       │   │   │   │       └── CtaWidgetComponent.tsx
    │       │   │   └── editors
    │       │   │   │   ├── ButtonBlockEditor.tsx
    │       │   │   │   ├── FormBlockEditor.tsx
    │       │   │   │   ├── HeadingBlockEditor.tsx
    │       │   │   │   ├── ImageBlockEditor.tsx
    │       │   │   │   ├── PostsGridBlockEditor.tsx
    │       │   │   │   ├── SectionBlockEditor.tsx
    │       │   │   │   ├── TextBlockEditor.tsx
    │       │   │   │   └── VideoEmbedBlockEditor.tsx
    │       │   ├── components
    │       │   │   ├── ConfirmationModal.tsx
    │       │   │   ├── ContentLanguageSwitcher.tsx
    │       │   │   ├── CopyContentFromLanguage.tsx
    │       │   │   └── LanguageFilterSelect.tsx
    │       │   ├── dashboard
    │       │   │   └── page.tsx
    │       │   ├── layout.tsx
    │       │   ├── media
    │       │   │   ├── [id]
    │       │   │   │   └── edit
    │       │   │   │   │   └── page.tsx
    │       │   │   ├── actions.ts
    │       │   │   ├── components
    │       │   │   │   ├── DeleteMediaButtonClient.tsx
    │       │   │   │   ├── MediaEditForm.tsx
    │       │   │   │   ├── MediaGridClient.tsx
    │       │   │   │   ├── MediaImage.tsx
    │       │   │   │   └── MediaUploadForm.tsx
    │       │   │   └── page.tsx
    │       │   ├── navigation
    │       │   │   ├── [id]
    │       │   │   │   └── edit
    │       │   │   │   │   └── page.tsx
    │       │   │   ├── actions.ts
    │       │   │   ├── components
    │       │   │   │   ├── DeleteNavItemButton.tsx
    │       │   │   │   ├── NavigationItemForm.tsx
    │       │   │   │   ├── NavigationLanguageSwitcher.tsx
    │       │   │   │   ├── NavigationMenuDnd.tsx
    │       │   │   │   └── SortableNavItem.tsx
    │       │   │   ├── new
    │       │   │   │   └── page.tsx
    │       │   │   ├── page.tsx
    │       │   │   └── utils.ts
    │       │   ├── pages
    │       │   │   ├── [id]
    │       │   │   │   └── edit
    │       │   │   │   │   └── page.tsx
    │       │   │   ├── actions.ts
    │       │   │   ├── components
    │       │   │   │   ├── DeletePageButtonClient.tsx
    │       │   │   │   └── PageForm.tsx
    │       │   │   ├── new
    │       │   │   │   └── page.tsx
    │       │   │   └── page.tsx
    │       │   ├── posts
    │       │   │   ├── [id]
    │       │   │   │   └── edit
    │       │   │   │   │   └── page.tsx
    │       │   │   ├── actions.ts
    │       │   │   ├── components
    │       │   │   │   ├── DeletePostButtonClient.tsx
    │       │   │   │   └── PostForm.tsx
    │       │   │   ├── new
    │       │   │   │   └── page.tsx
    │       │   │   └── page.tsx
    │       │   ├── settings
    │       │   │   ├── copyright
    │       │   │   │   ├── actions.ts
    │       │   │   │   ├── components
    │       │   │   │   │   └── CopyrightForm.tsx
    │       │   │   │   └── page.tsx
    │       │   │   ├── extra-translations
    │       │   │   │   ├── actions.ts
    │       │   │   │   └── page.tsx
    │       │   │   ├── languages
    │       │   │   │   ├── [id]
    │       │   │   │   │   └── edit
    │       │   │   │   │   │   └── page.tsx
    │       │   │   │   ├── actions.ts
    │       │   │   │   ├── components
    │       │   │   │   │   ├── DeleteLanguageButton.tsx
    │       │   │   │   │   └── LanguageForm.tsx
    │       │   │   │   ├── new
    │       │   │   │   │   └── page.tsx
    │       │   │   │   └── page.tsx
    │       │   │   └── logos
    │       │   │   │   ├── [id]
    │       │   │   │       └── edit
    │       │   │   │       │   └── page.tsx
    │       │   │   │   ├── actions.ts
    │       │   │   │   ├── components
    │       │   │   │       └── LogoForm.tsx
    │       │   │   │   ├── new
    │       │   │   │       └── page.tsx
    │       │   │   │   ├── page.tsx
    │       │   │   │   └── types.ts
    │       │   └── users
    │       │   │   ├── [id]
    │       │   │       └── edit
    │       │   │       │   └── page.tsx
    │       │   │   ├── actions.ts
    │       │   │   ├── components
    │       │   │       ├── DeleteUserButton.tsx
    │       │   │       └── UserForm.tsx
    │       │   │   └── page.tsx
    │       ├── favicon.ico
    │       ├── layout.tsx
    │       ├── lib
    │       │   └── sitemap-utils.ts
    │       ├── page.tsx
    │       ├── robots.txt
    │       │   └── route.ts
    │       ├── sitemap.xml
    │       │   └── route.ts
    │       └── unauthorized
    │       │   └── page.tsx
    │   ├── backup
    │       ├── backup_2025-06-19.sql
    │       ├── backup_2025-06-20.sql
    │       ├── backup_2025-07-08.sql
    │       ├── backup_2025-07-09.sql
    │       └── backup_2025-07-10.sql
    │   ├── components
    │       ├── BlockRenderer.tsx
    │       ├── FooterNavigation.tsx
    │       ├── Header.tsx
    │       ├── LanguageSwitcher.tsx
    │       ├── ResponsiveNav.tsx
    │       ├── blocks
    │       │   ├── PostCardSkeleton.tsx
    │       │   ├── PostsGridBlock.tsx
    │       │   ├── PostsGridClient.tsx
    │       │   ├── renderers
    │       │   │   ├── ButtonBlockRenderer.tsx
    │       │   │   ├── ClientTextBlockRenderer.tsx
    │       │   │   ├── FormBlockRenderer.tsx
    │       │   │   ├── HeadingBlockRenderer.tsx
    │       │   │   ├── HeroBlockRenderer.tsx
    │       │   │   ├── ImageBlockRenderer.tsx
    │       │   │   ├── PostsGridBlockRenderer.tsx
    │       │   │   ├── SectionBlockRenderer.tsx
    │       │   │   ├── TextBlockRenderer.tsx
    │       │   │   ├── VideoEmbedBlockRenderer.tsx
    │       │   │   └── inline
    │       │   │   │   ├── AlertWidgetRenderer.tsx
    │       │   │   │   └── CtaWidgetRenderer.tsx
    │       │   └── types.ts
    │       ├── env-var-warning.tsx
    │       ├── form-message.tsx
    │       ├── header-auth.tsx
    │       ├── submit-button.tsx
    │       └── theme-switcher.tsx
    │   ├── context
    │       ├── AuthContext.tsx
    │       ├── CurrentContentContext.tsx
    │       └── LanguageContext.tsx
    │   ├── docs
    │       ├── cms-application-overview.md
    │       ├── cms-architecture-overview.md
    │       └── tiptap-bundle-optimization-summary.md
    │   ├── eslint.config.mjs
    │   ├── index.d.ts
    │   ├── lib
    │       └── blocks
    │       │   ├── README.md
    │       │   └── blockRegistry.ts
    │   ├── middleware.ts
    │   ├── next-env.d.ts
    │   ├── next.config.js
    │   ├── postcss.config.js
    │   ├── project.json
    │   ├── public
    │       └── .gitkeep
    │   ├── scripts
    │       ├── backfill-image-meta.ts
    │       ├── backup.js
    │       └── test-bundle-optimization.js
    │   ├── tailwind.config.ts
    │   └── tsconfig.json
├── components.json
├── docs
    ├── AI-Dev-Onboarding-Guide.md
    ├── Tiptap Feature-Rich Editor Prompts.md
    ├── block-editor-analysis.md
    ├── inline-cta-widget-design.md
    ├── inline-widget-design.md
    └── monorepo-archetecture.md
├── eslint.config.mjs
├── libs
    ├── db
    │   ├── README.md
    │   ├── eslint.config.mjs
    │   ├── project.json
    │   ├── src
    │   │   ├── index.ts
    │   │   ├── lib
    │   │   │   └── supabase
    │   │   │   │   ├── client.ts
    │   │   │   │   ├── middleware.ts
    │   │   │   │   ├── server.ts
    │   │   │   │   ├── ssg-client.ts
    │   │   │   │   └── types.ts
    │   │   ├── server.ts
    │   │   └── supabase
    │   │   │   ├── .gitignore
    │   │   │   ├── config.toml
    │   │   │   └── migrations
    │   │   │       ├── 20250513194738_setup_roles_and_profiles.sql
    │   │   │       ├── 20250513194910_auto_create_profile_trigger.sql
    │   │   │       ├── 20250513194916_rls_for_profiles.sql
    │   │   │       ├── 20250514125634_fix_recursive_rls_policies.sql
    │   │   │       ├── 20250514143016_setup_languages_table.sql
    │   │   │       ├── 20250514171549_create_pages_table.sql
    │   │   │       ├── 20250514171550_create_posts_table.sql
    │   │   │       ├── 20250514171552_create_media_table.sql
    │   │   │       ├── 20250514171553_create_blocks_table.sql
    │   │   │       ├── 20250514171615_create_navigation_table.sql
    │   │   │       ├── 20250514171627_rls_policies_for_content_tables.sql
    │   │   │       ├── 20250515194800_add_translation_group_id.sql
    │   │   │       ├── 20250520171900_add_translation_group_to_nav_items.sql
    │   │   │       ├── 20250521143933_seed_homepage_and_nav.sql
    │   │   │       ├── 20250523145833_add_feature_image_to_posts.sql
    │   │   │       ├── 20250523151737_add_rls_to_media_table.sql
    │   │   │       ├── 20250526110400_add_image_dimensions_to_media.sql
    │   │   │       ├── 20250526153321_optimize_rls_policies.sql
    │   │   │       ├── 20250526172513_resolve_select_policy_overlaps.sql
    │   │   │       ├── 20250526172853_resolve_remaining_rls_v5.sql
    │   │   │       ├── 20250526173538_finalize_rls_cleanup_v7.sql
    │   │   │       ├── 20250526174710_separate_write_policies_v8.sql
    │   │   │       ├── 20250526175359_fix_languages_select_rls_v9.sql
    │   │   │       ├── 20250526182940_fix_nav_read_policy_v10.sql
    │   │   │       ├── 20250526183239_fix_posts_read_rls_v11.sql
    │   │   │       ├── 20250526183746_fix_media_select_rls_v12.sql
    │   │   │       ├── 20250526184205_consolidate_content_read_rls_v13.sql
    │   │   │       ├── 20250526185854_optimize_indexes.sql
    │   │   │       ├── 20250526190900_debug_blocks_rls.sql
    │   │   │       ├── 20250526191217_consolidate_blocks_select_rls.sql
    │   │   │       ├── 20250526192822_fix_handle_languages_update_search_path.sql
    │   │   │       ├── 20250527150500_fix_blocks_rls_policy.sql
    │   │   │       ├── 20250602150602_add_blur_data_url_to_media.sql
    │   │   │       ├── 20250602150959_add_variants_to_media.sql
    │   │   │       ├── 20250618124000_create_get_my_claim_function.sql
    │   │   │       ├── 20250618124100_create_logos_table.sql
    │   │   │       ├── 20250618130000_fix_linter_warnings.sql
    │   │   │       ├── 20250618151500_revert_storage_rls.sql
    │   │   │       ├── 20250619084800_reinstate_storage_rls.sql
    │   │   │       ├── 20250619092430_widen_logo_insert_policy.sql
    │   │   │       ├── 20250619093122_fix_get_my_claim_volatility.sql
    │   │   │       ├── 20250619104249_consolidated_logo_rls_fix.sql
    │   │   │       ├── 20250619110700_fix_logo_rls_again.sql
    │   │   │       ├── 20250619113200_add_file_path_to_media.sql
    │   │   │       ├── 20250619124100_fix_rls_performance_warnings.sql
    │   │   │       ├── 20250619195500_create_site_settings_table.sql
    │   │   │       ├── 20250619201500_add_anon_read_to_site_settings.sql
    │   │   │       ├── 20250619202000_add_is_active_to_languages.sql
    │   │   │       ├── 20250620085700_fix_site_settings_write_rls.sql
    │   │   │       ├── 20250620095500_fix_profiles_read_rls.sql
    │   │   │       ├── 20250620100000_use_security_definer_for_rls.sql
    │   │   │       ├── 20250620130000_add_public_read_to_logos.sql
    │   │   │       ├── 20250708091700_create_translations_table.sql
    │   │   │       ├── 20250708093403_seed_translations_table.sql
    │   │   │       ├── 20250708110600_fix_translations_rls_policies.sql
    │   │   │       └── 20250708112300_add_new_translations.sql
    │   ├── tsconfig.json
    │   ├── tsconfig.lib.json
    │   └── vite.config.ts
    ├── environment.d.ts
    ├── sdk
    │   ├── README.md
    │   ├── eslint.config.mjs
    │   ├── package.json
    │   ├── project.json
    │   ├── src
    │   │   ├── index.ts
    │   │   └── lib
    │   │   │   └── sdk.ts
    │   ├── tsconfig.json
    │   ├── tsconfig.lib.json
    │   └── vite.config.ts
    ├── ui
    │   ├── .babelrc
    │   ├── README.md
    │   ├── eslint.config.mjs
    │   ├── project.json
    │   ├── src
    │   │   ├── index.ts
    │   │   ├── lib
    │   │   │   ├── ColorPicker.tsx
    │   │   │   ├── ConfirmationDialog.tsx
    │   │   │   ├── CustomSelectWithInput.tsx
    │   │   │   ├── Skeleton.tsx
    │   │   │   ├── avatar.tsx
    │   │   │   ├── badge.tsx
    │   │   │   ├── button.tsx
    │   │   │   ├── card.tsx
    │   │   │   ├── checkbox.tsx
    │   │   │   ├── dialog.tsx
    │   │   │   ├── dropdown-menu.tsx
    │   │   │   ├── input.tsx
    │   │   │   ├── label.tsx
    │   │   │   ├── popover.tsx
    │   │   │   ├── progress.tsx
    │   │   │   ├── select.tsx
    │   │   │   ├── separator.tsx
    │   │   │   ├── table.tsx
    │   │   │   ├── textarea.tsx
    │   │   │   ├── tooltip.tsx
    │   │   │   └── ui.tsx
    │   │   └── styles
    │   │   │   └── globals.css
    │   ├── tsconfig.json
    │   ├── tsconfig.lib.json
    │   └── vite.config.ts
    └── utils
    │   ├── README.md
    │   ├── eslint.config.mjs
    │   ├── project.json
    │   ├── src
    │       ├── index.ts
    │       ├── lib
    │       │   ├── check-env-vars.ts
    │       │   ├── client-utils.ts
    │       │   ├── email-config.ts
    │       │   ├── r2-client.ts
    │       │   ├── translations-context.tsx
    │       │   ├── translations.ts
    │       │   └── utils.ts
    │       └── server.ts
    │   ├── tsconfig.json
    │   ├── tsconfig.lib.json
    │   └── vite.config.ts
├── nx.json
├── package-lock.json
├── package.json
├── project.json
├── tailwind.config.ts
└── tsconfig.base.json
