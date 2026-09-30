package `in`.ticketghar.mahaticket.data.db

import android.content.Context
import androidx.room.*

@Database(
    entities = [
        CachedEvent::class,
        CachedCity::class,
        CachedTicket::class
    ],
    version = 1,
    exportSchema = false
)
abstract class MahaDatabase : RoomDatabase() {
    abstract fun eventDao(): EventDao
    abstract fun cityDao(): CityDao
    abstract fun ticketDao(): TicketDao
    
    companion object {
        @Volatile
        private var INSTANCE: MahaDatabase? = null
        
        fun getDatabase(context: Context): MahaDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    MahaDatabase::class.java,
                    "mahaticket_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}

// Cached Event Entity
@Entity(tableName = "cached_events")
data class CachedEvent(
    @PrimaryKey val id: Int,
    val title: String,
    val titleMr: String,
    val category: String,
    val categoryMr: String,
    val language: String,
    val durationMinutes: Int,
    val description: String,
    val posterUrl: String,
    val minPrice: Int?,
    val venueName: String?,
    val venueNameMr: String?,
    val city: String?,
    val cachedAt: Long = System.currentTimeMillis()
)

@Dao
interface EventDao {
    @Query("SELECT * FROM cached_events ORDER BY cachedAt DESC")
    suspend fun getAllCachedEvents(): List<CachedEvent>
    
    @Query("SELECT * FROM cached_events WHERE category = :category ORDER BY cachedAt DESC")
    suspend fun getCachedEventsByCategory(category: String): List<CachedEvent>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEvents(events: List<CachedEvent>)
    
    @Query("DELETE FROM cached_events WHERE cachedAt < :expiryTimestamp")
    suspend fun deleteExpiredEvents(expiryTimestamp: Long)
}

// Cached City Entity
@Entity(tableName = "cached_cities")
data class CachedCity(
    @PrimaryKey val id: Int,
    val cityName: String,
    val cityNameMr: String,
    val cachedAt: Long = System.currentTimeMillis()
)

@Dao
interface CityDao {
    @Query("SELECT * FROM cached_cities ORDER BY cityName ASC")
    suspend fun getAllCities(): List<CachedCity>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCities(cities: List<CachedCity>)
    
    @Query("DELETE FROM cached_cities")
    suspend fun deleteAllCities()
}

// Cached Ticket Entity (offline viewing of purchased tickets)
@Entity(tableName = "cached_tickets")
data class CachedTicket(
    @PrimaryKey val ticketCode: String,
    val orderNumber: String,
    val eventTitle: String,
    val venueName: String,
    val showtime: String,
    val seatCode: String,
    val qrPayload: String,
    val attendeeName: String,
    val status: String,
    val grandTotal: Int,
    val cachedAt: Long = System.currentTimeMillis()
)

@Dao
interface TicketDao {
    @Query("SELECT * FROM cached_tickets ORDER BY showtime DESC")
    suspend fun getAllTickets(): List<CachedTicket>
    
    @Query("SELECT * FROM cached_tickets WHERE orderNumber = :orderNumber")
    suspend fun getTicketsByOrder(orderNumber: String): List<CachedTicket>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTickets(tickets: List<CachedTicket>)
    
    @Query("DELETE FROM cached_tickets WHERE ticketCode = :ticketCode")
    suspend fun deleteTicket(ticketCode: String)
}
