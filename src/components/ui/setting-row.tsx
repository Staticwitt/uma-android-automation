import SearchableItem from "../SearchableItem"
import { Row, type RowProps } from "./row"

export interface SettingRowProps extends RowProps {
    /** Search registry id (required for scroll-to and global search). */
    id: string
    /** Override searchable title; defaults to `title`. */
    searchTitle?: string
    /** Override searchable description; defaults to `description`. */
    searchDescription?: string
    /** Parent search id for fallback highlight when this row is hidden. */
    parentId?: string
    /** When false, row is hidden but remains searchable with parent fallback. */
    condition?: boolean
}

/**
 * Standard settings row: searchable registry entry + `Row` layout.
 */
export const SettingRow = ({
    id,
    title,
    description,
    searchTitle,
    searchDescription,
    parentId,
    condition = true,
    right,
    onPress,
    disabled,
    style,
}: SettingRowProps) => (
    <SearchableItem
        id={id}
        title={searchTitle ?? title}
        description={searchDescription ?? description}
        parentId={parentId}
        condition={condition}
    >
        <Row title={title} description={description} right={right} onPress={onPress} disabled={disabled} style={style} />
    </SearchableItem>
)
